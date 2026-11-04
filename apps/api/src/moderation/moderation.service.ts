import { Inject, Injectable } from '@nestjs/common';
import { ADMIN_LISTINGS_PAGE_SIZE, DEFAULT_LOCALE, isLocale, type AdminListing, type ListingStatus, type PublicUser } from '@yoyo/shared';
import { CLOCK, type Clock } from '../clock/clock';
import { AppError } from '../common/app-error';
import { ENV, type Env } from '../config/env';
import type { Listing, User } from '../generated/prisma/client';
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
    private readonly mail: MailService,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ENV) private readonly env: Pick<Env, 'WEB_ORIGIN'>,
  ) {}

  /** Listings in `status` (the review queue by default), the longest waiting first. */
  async queue(status: ListingStatus = 'PENDING_REVIEW', page = 1): Promise<{ items: AdminListing[]; total: number }> {
    const where = { status };
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

  private notify(listing: Listing, owner: User, decision: Decision): void {
    if (owner.deletedAt !== null) return;
    const title = listing.title ?? '';
    if (decision.action === 'approve') {
      void this.mail.sendListingApproved(owner, { title, link: sitePath(this.env.WEB_ORIGIN, owner.locale, `/items/${listing.id}`) });
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
