import { Inject, Injectable } from '@nestjs/common';
import { ADMIN_LISTINGS_PAGE_SIZE, DEFAULT_LOCALE, isLocale, listingSlug, type AdminListing, type ListingStatus, type LocalizedText, type PublicUser } from '@yoyo/shared';
import { CategoriesService } from '../categories/categories.service';
import { keepKnownAttributes } from '../categories/ensure-categories';
import { CLOCK, type Clock } from '../clock/clock';
import { AppError } from '../common/app-error';
import { ENV, type Env } from '../config/env';
import type { Listing, Prisma, User } from '../generated/prisma/client';
import { nextStatus } from '../listings/listing-status';
import { serializeListing, type ListingWithRelations } from '../listings/listing.serializer';
import { invalidStatus, ListingsService } from '../listings/listings.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';

/** `https://site` + `/lv` (no prefix for English) + path, the site's URL scheme. */
export function sitePath(origin: string, locale: string, path: string): string {
  const prefix = isLocale(locale) && locale !== DEFAULT_LOCALE ? `/${locale}` : '';
  return `${origin}${prefix}${path}`;
}

type Decision = { action: 'approve' } | { action: 'reject'; reason: string };

@Injectable()
export class ModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly listings: ListingsService,
    private readonly categories: CategoriesService,
    private readonly mail: MailService,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ENV) private readonly env: Pick<Env, 'WEB_ORIGIN'>,
  ) {}

  /**
   * Listings in `status` (the review queue by default), the longest waiting first. With `category` (a
   * category key, such as `other`), the listings filed there, in any status but draft and archived
   * unless `status` names one: the «Other» queue, whose listings moderation moves to better categories.
   */
  async queue(status?: ListingStatus, page = 1, category?: string): Promise<{ items: AdminListing[]; total: number }> {
    const where: Prisma.ListingWhereInput =
      category === undefined
        ? { status: status ?? 'PENDING_REVIEW' }
        : { category: { slug: category }, status: status ?? { in: ['PENDING_REVIEW', 'PUBLISHED', 'HIDDEN', 'REJECTED'] } };
    const [rows, total] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        include: { photos: true, unavailability: true, owner: true },
        orderBy: [{ submittedAt: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * ADMIN_LISTINGS_PAGE_SIZE,
        take: ADMIN_LISTINGS_PAGE_SIZE,
      }),
      this.prisma.listing.count({ where }),
    ]);
    return { items: rows.map((row) => this.toAdmin(row, row.owner)), total };
  }

  /**
   * Approves (PUBLISHED) or rejects (REJECTED, with the reason) a listing in review and emails the
   * owner in their language. Only PENDING_REVIEW can be decided (409 otherwise); an administrator
   * never decides on their own listing (403). `version` is the one the administrator reviewed: a
   * listing the owner changed since is refused (409), so nothing unseen is ever published.
   */
  async decide(id: string, admin: PublicUser, decision: Decision, version: number): Promise<AdminListing> {
    const listing = await this.prisma.listing.findUnique({ where: { id }, include: { owner: true } });
    if (!listing) throw new AppError('NOT_FOUND', 404, 'Listing not found');
    if (listing.ownerId === admin.id) throw new AppError('AUTH_FORBIDDEN', 403, 'Another administrator reviews your own listings');
    const status = nextStatus(listing.status, decision.action);
    if (status === null || status === 'REMOVED') throw invalidStatus(listing.status);
    if (version !== listing.version) throw this.listings.stale(listing.version);

    const now = this.clock.now();
    await this.listings.transition(listing, status, {
      reviewedAt: now,
      reviewedById: admin.id,
      ...(decision.action === 'approve'
        ? { publishedAt: listing.publishedAt ?? now, rejectionReason: null }
        : { rejectionReason: decision.reason }),
    });
    this.notify(listing, listing.owner, decision);

    const fresh = await this.prisma.listing.findUniqueOrThrow({ where: { id }, include: { photos: true, unavailability: true, owner: true } });
    return this.toAdmin(fresh, fresh.owner);
  }

  /**
   * Files a listing under another category (owner's decision 2026-11-06: mostly out of «Other»). Its
   * status stays (moving is not the owner's change, so nothing goes back to review); attribute values
   * the new category does not know are dropped; the owner is emailed in their language. Only an active
   * category without subcategories takes it; not one's own listing; `version` is the one looked at.
   */
  async moveCategory(id: string, admin: PublicUser, categoryId: string, version: number): Promise<AdminListing> {
    const listing = await this.prisma.listing.findUnique({ where: { id }, include: { owner: true } });
    if (!listing) throw new AppError('NOT_FOUND', 404, 'Listing not found');
    if (listing.ownerId === admin.id) throw new AppError('AUTH_FORBIDDEN', 403, 'Another administrator handles your own listings');
    if (listing.status === 'ARCHIVED') throw invalidStatus(listing.status);
    if (version !== listing.version) throw this.listings.stale(listing.version);
    const target = await this.categories.forListing(categoryId);
    if (!target || !target.leaf) throw new AppError('VALIDATION_FAILED', 400, undefined, { categoryId: 'Choose a category without subcategories' });
    if (target.id === listing.categoryId) throw new AppError('VALIDATION_FAILED', 400, undefined, { categoryId: 'Already in this category' });

    const moved = await this.prisma.listing.updateMany({
      where: { id, version },
      data: { categoryId: target.id, attributes: keepKnownAttributes(listing.attributes, target.attributes), version: { increment: 1 } },
    });
    if (moved.count === 0) throw this.listings.stale(listing.version + 1);
    const category = await this.prisma.category.findUniqueOrThrow({ where: { id: target.id }, select: { names: true } });
    if (listing.owner.deletedAt === null) {
      void this.mail.sendListingMoved(listing.owner, {
        title: listing.title ?? '',
        category: category.names as LocalizedText,
        link: sitePath(this.env.WEB_ORIGIN, listing.owner.locale, `/listings/${listing.id}/edit?step=attributes`),
      });
    }
    const fresh = await this.prisma.listing.findUniqueOrThrow({ where: { id }, include: { photos: true, unavailability: true, owner: true } });
    return this.toAdmin(fresh, fresh.owner);
  }

  private notify(listing: Listing, owner: User, decision: Decision): void {
    if (owner.deletedAt !== null) return;
    const title = listing.title ?? '';
    if (decision.action === 'approve') {
      // The item's own address: in the language it is written in (its canonical page, plan 7).
      void this.mail.sendListingApproved(owner, {
        title,
        link: sitePath(this.env.WEB_ORIGIN, listing.contentLocale, `/listings/${listing.id}-${listingSlug(listing.title)}`),
      });
    } else {
      void this.mail.sendListingRejected(owner, {
        title,
        reason: decision.reason,
        link: sitePath(this.env.WEB_ORIGIN, owner.locale, `/listings/${listing.id}/edit`),
      });
    }
  }

  private toAdmin(listing: ListingWithRelations, owner: User): AdminListing {
    return {
      ...serializeListing(listing, 'admin', this.listings.urlFor),
      owner: { id: owner.id, name: owner.name, email: owner.email },
    };
  }
}
