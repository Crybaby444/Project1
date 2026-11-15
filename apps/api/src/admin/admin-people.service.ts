import { Injectable } from '@nestjs/common';
import type { AdminUserDetail, PublicUser } from '@yoyo/shared';
import { AuditService } from '../audit/audit.service';
import { AppError } from '../common/app-error';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReviewsService } from '../reviews/reviews.service';

const iso = (d: Date | null | undefined) => d?.toISOString() ?? null;

/**
 * A person in full for administrators, private notes about them, and content moderation after
 * publication: taking a listing down (with a reason the owner is told) and hiding a review. Every
 * action goes to the audit log.
 */
@Injectable()
export class AdminPeopleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly reviews: ReviewsService,
  ) {}

  async detail(id: string): Promise<AdminUserDetail> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new AppError('NOT_FOUND', 404, 'User not found');
    const p = this.prisma;
    const [listings, deals, reviews, reports, notes, lastToken, wallet, earned, listingCount, asRenter, asOwner, completed, reportsAgainst, ratings] =
      await Promise.all([
        p.listing.findMany({ where: { ownerId: id, status: { not: 'ARCHIVED' } }, orderBy: { updatedAt: 'desc' }, take: 50, select: { id: true, title: true, status: true, dailyCents: true, updatedAt: true } }),
        p.booking.findMany({
          where: { OR: [{ renterId: id }, { ownerId: id }] },
          orderBy: { createdAt: 'desc' },
          take: 30,
          select: { id: true, status: true, renterId: true, totalCents: true, createdAt: true, listing: { select: { title: true } } },
        }),
        p.review.findMany({ where: { subjectId: id }, orderBy: { createdAt: 'desc' }, take: 30, include: { author: { select: { name: true } } } }),
        p.report.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' }, take: 30 }),
        p.adminNote.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' } }),
        p.refreshToken.findFirst({ where: { userId: id }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
        p.ledgerAccount.findUnique({ where: { id: `wallet:${id}` }, select: { balance: true } }),
        p.booking.aggregate({ _sum: { ownerPayoutCents: true }, where: { ownerId: id, status: 'COMPLETED' } }),
        p.listing.count({ where: { ownerId: id, status: { notIn: ['ARCHIVED', 'DRAFT'] } } }),
        p.booking.count({ where: { renterId: id } }),
        p.booking.count({ where: { ownerId: id } }),
        p.booking.count({ where: { OR: [{ renterId: id }, { ownerId: id }], status: 'COMPLETED' } }),
        p.report.count({ where: { userId: id } }),
        this.reviews.ratingsOfUsers([id]),
      ]);
    const rating = ratings.get(id) ?? { rating: null, reviewCount: 0 };
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        locale: user.locale,
        city: user.city || null,
        emailVerified: user.emailVerifiedAt !== null,
        phoneVerified: user.phoneVerifiedAt !== null,
        createdAt: user.createdAt.toISOString(),
        blockedAt: iso(user.blockedAt),
        deletedAt: iso(user.deletedAt),
        lastSeenAt: iso(lastToken?.createdAt),
      },
      stats: {
        listings: listingCount,
        dealsAsRenter: asRenter,
        dealsAsOwner: asOwner,
        completed,
        rating: rating.rating,
        reviews: rating.reviewCount,
        walletCents: wallet?.balance ?? 0,
        earnedCents: earned._sum.ownerPayoutCents ?? 0,
        reportsAgainst,
      },
      listings: listings.map((l) => ({ id: l.id, title: l.title ?? '', status: l.status, dailyCents: l.dailyCents, updatedAt: l.updatedAt.toISOString() })),
      deals: deals.map((d) => ({ id: d.id, title: d.listing.title ?? '', status: d.status, role: d.renterId === id ? 'RENTER' : 'OWNER', totalCents: d.totalCents, createdAt: d.createdAt.toISOString() })),
      reviews: reviews.map((r) => ({ id: r.id, rating: r.rating, text: r.text, author: r.author.name, createdAt: r.createdAt.toISOString(), hidden: r.hiddenAt !== null })),
      reports: reports.map((r) => ({ id: r.id, reason: r.reason, note: r.note, status: r.status, createdAt: r.createdAt.toISOString() })),
      notes: notes.map((n) => ({ id: n.id, text: n.text, admin: n.adminName, createdAt: n.createdAt.toISOString() })),
    };
  }

  async addNote(admin: PublicUser, userId: string, text: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user) throw new AppError('NOT_FOUND', 404, 'User not found');
    await this.prisma.adminNote.create({ data: { userId, adminId: admin.id, adminName: admin.name, text } });
    await this.audit.record(admin, { action: 'USER_NOTE', targetType: 'USER', targetId: userId, summary: user.email, after: { text } });
  }

  /** Takes a published (or owner-hidden) listing down: it needs changes before it can return. */
  async takedown(admin: PublicUser, listingId: string, reason: string): Promise<void> {
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId }, select: { id: true, title: true, status: true, ownerId: true } });
    if (!listing) throw new AppError('NOT_FOUND', 404, 'Listing not found');
    if (listing.status !== 'PUBLISHED' && listing.status !== 'HIDDEN') {
      throw new AppError('INVALID_STATUS', 409, 'Only a listing in the catalog can be taken down', undefined, { status: listing.status });
    }
    await this.prisma.listing.update({ where: { id: listingId }, data: { status: 'REJECTED', rejectionReason: reason, version: { increment: 1 } } });
    await this.notifications.notify([listing.ownerId], { kind: 'LISTING', event: 'REJECTED', listingId, title: listing.title });
    await this.audit.record(admin, { action: 'LISTING_HIDDEN', targetType: 'LISTING', targetId: listingId, summary: listing.title ?? '', before: { status: listing.status }, after: { status: 'REJECTED', reason } });
  }

  async setReviewHidden(admin: PublicUser, reviewId: string, reason: string | null): Promise<void> {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId }, select: { id: true, text: true, subjectId: true, hiddenAt: true } });
    if (!review) throw new AppError('NOT_FOUND', 404, 'Review not found');
    const hide = reason !== null;
    await this.prisma.review.update({ where: { id: reviewId }, data: hide ? { hiddenAt: new Date(), hiddenReason: reason } : { hiddenAt: null, hiddenReason: null } });
    await this.audit.record(admin, {
      action: hide ? 'REVIEW_HIDDEN' : 'REVIEW_SHOWN',
      targetType: 'REVIEW',
      targetId: reviewId,
      summary: review.text.slice(0, 80),
      before: { hidden: review.hiddenAt !== null },
      after: hide ? { hidden: true, reason } : { hidden: false },
    });
  }
}
