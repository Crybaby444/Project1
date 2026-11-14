import { Inject, Injectable } from '@nestjs/common';
import { canReview, reviewDeadline, reviewIsPublic, type BookingSnapshot } from '@yoyo/domain';
import type { DealReviews, PublicReview, ReviewPage, ReviewRequest } from '@yoyo/shared';
import { BookingRulesService } from '../bookings/booking-rules.service';
import { CLOCK, type Clock } from '../clock/clock';
import { AppError } from '../common/app-error';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const PAGE_SIZE = 10;

const REVIEW_INCLUDE = {
  author: { select: { id: true, name: true } },
  listing: { select: { id: true, title: true } },
  booking: { select: { completedAt: true, reviews: { select: { authorId: true } } } },
} as const satisfies Prisma.ReviewInclude;

type ReviewRow = Prisma.ReviewGetPayload<{ include: typeof REVIEW_INCLUDE }>;

export type Rating = { rating: number | null; reviewCount: number };
const NO_RATING: Rating = { rating: null, reviewCount: 0 };

/** One decimal, as the site shows it. */
const oneDecimal = (n: number) => Math.round(n * 10) / 10;

function toPublic(row: ReviewRow): PublicReview {
  return {
    id: row.id,
    rating: row.rating,
    itemRating: row.itemRating,
    text: row.text,
    createdAt: row.createdAt.toISOString(),
    author: { id: row.author.id, name: row.author.name },
    authorRole: row.authorRole,
    listing: row.listing ? { id: row.listing.id, title: row.listing.title ?? '' } : null,
  };
}

/**
 * Reviews after a completed deal (plan 10, spec §4.4 step 8): each side reviews the other once within
 * the review window; the renter also scores the item. Blind: a review is public only once both sides
 * wrote, or once the window closed (@yoyo/domain reviewIsPublic). Ratings come from public reviews.
 */
@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rules: BookingRulesService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  private async windowDays(): Promise<number> {
    return (await this.rules.settings()).reviewWindowDays;
  }

  private isPublic(row: ReviewRow, windowDays: number, now: Date): boolean {
    if (!row.booking.completedAt) return false;
    const otherSideReviewed = row.booking.reviews.some((r) => r.authorId !== row.authorId);
    return reviewIsPublic({ completedAt: row.booking.completedAt, now, windowDays, otherSideReviewed });
  }

  /** A deal the user is a side of, or 404 (a deal that is not yours does not exist). */
  private async dealOf(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking || (booking.renterId !== userId && booking.ownerId !== userId)) {
      throw new AppError('NOT_FOUND', 404, 'Deal not found');
    }
    return booking;
  }

  async dealReviews(userId: string, bookingId: string): Promise<DealReviews> {
    const booking = await this.dealOf(userId, bookingId);
    const windowDays = await this.windowDays();
    const now = this.clock.now();
    const rows = await this.prisma.review.findMany({ where: { bookingId }, include: REVIEW_INCLUDE });
    const mine = rows.find((r) => r.authorId === userId) ?? null;
    const theirs = rows.find((r) => r.authorId !== userId) ?? null;
    const snapshot = { status: booking.status, completedAt: booking.completedAt ?? undefined } as BookingSnapshot;
    const settings = await this.rules.settings();
    const theirsPublic = theirs !== null && this.isPublic(theirs, windowDays, now);
    return {
      canReview: mine === null && canReview(snapshot, now, settings),
      deadline: booking.completedAt ? reviewDeadline(booking.completedAt, windowDays).toISOString() : null,
      viewerRole: booking.renterId === userId ? 'RENTER' : 'OWNER',
      mine: mine ? toPublic(mine) : null,
      theirs: theirsPublic ? toPublic(theirs) : null,
      theirsWaiting: theirs !== null && !theirsPublic,
    };
  }

  async create(userId: string, bookingId: string, request: ReviewRequest): Promise<PublicReview> {
    const booking = await this.dealOf(userId, bookingId);
    const settings = await this.rules.settings();
    const snapshot = { status: booking.status, completedAt: booking.completedAt ?? undefined } as BookingSnapshot;
    if (!canReview(snapshot, this.clock.now(), settings)) {
      throw new AppError('ACTION_NOT_ALLOWED', 409, 'This deal cannot be reviewed now', undefined, { why: 'REVIEW_CLOSED' });
    }
    const asRenter = booking.renterId === userId;
    if (asRenter && request.itemRating === undefined) {
      throw new AppError('VALIDATION_FAILED', 400, 'Score the item too', { itemRating: 'required' });
    }
    try {
      const row = await this.prisma.review.create({
        data: {
          bookingId,
          authorId: userId,
          subjectId: asRenter ? booking.ownerId : booking.renterId,
          listingId: booking.listingId,
          authorRole: asRenter ? 'RENTER' : 'OWNER',
          rating: request.rating,
          // The owner's stars are about the renter only.
          itemRating: asRenter ? (request.itemRating ?? null) : null,
          text: request.text,
          createdAt: this.clock.now(),
        },
        include: REVIEW_INCLUDE,
      });
      return toPublic(row);
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        throw new AppError('ACTION_NOT_ALLOWED', 409, 'You have already reviewed this deal', undefined, { why: 'ALREADY_REVIEWED' });
      }
      throw error;
    }
  }

  private async publicRows(where: Prisma.ReviewWhereInput): Promise<ReviewRow[]> {
    const windowDays = await this.windowDays();
    const now = this.clock.now();
    const rows = await this.prisma.review.findMany({ where, include: REVIEW_INCLUDE, orderBy: { createdAt: 'desc' } });
    return rows.filter((row) => this.isPublic(row, windowDays, now));
  }

  private page(rows: ReviewRow[], page: number, stars: (row: ReviewRow) => number | null): ReviewPage {
    const scored = rows.map(stars).filter((n): n is number => n !== null);
    return {
      items: rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(toPublic),
      total: rows.length,
      page,
      pageSize: PAGE_SIZE,
      average: scored.length ? oneDecimal(scored.reduce((a, b) => a + b, 0) / scored.length) : 0,
    };
  }

  /** Public reviews about a person, newest first. */
  async forUser(userId: string, page = 1): Promise<ReviewPage> {
    return this.page(await this.publicRows({ subjectId: userId }), page, (r) => r.rating);
  }

  /** The renters' public reviews of an item, newest first; the average is of the item stars. */
  async forListing(listingId: string, page = 1): Promise<ReviewPage> {
    return this.page(await this.publicRows({ listingId, authorRole: 'RENTER' }), page, (r) => r.itemRating);
  }

  /** People's ratings from public reviews about them. */
  async ratingsOfUsers(ids: readonly string[]): Promise<Map<string, Rating>> {
    if (ids.length === 0) return new Map();
    const rows = await this.publicRows({ subjectId: { in: [...ids] } });
    return this.average(ids, rows, (r) => r.subjectId, (r) => r.rating);
  }

  /** Items' ratings from the renters' item stars in public reviews. */
  async ratingsOfListings(ids: readonly string[]): Promise<Map<string, Rating>> {
    if (ids.length === 0) return new Map();
    const rows = await this.publicRows({ listingId: { in: [...ids] }, authorRole: 'RENTER' });
    return this.average(ids, rows, (r) => r.listingId, (r) => r.itemRating);
  }

  private average(ids: readonly string[], rows: ReviewRow[], key: (r: ReviewRow) => string, stars: (r: ReviewRow) => number | null) {
    const out = new Map<string, Rating>(ids.map((id) => [id, NO_RATING]));
    const sums = new Map<string, { sum: number; n: number }>();
    for (const row of rows) {
      const s = stars(row);
      if (s === null) continue;
      const acc = sums.get(key(row)) ?? { sum: 0, n: 0 };
      sums.set(key(row), { sum: acc.sum + s, n: acc.n + 1 });
    }
    for (const [id, { sum, n }] of sums) out.set(id, { rating: oneDecimal(sum / n), reviewCount: n });
    return out;
  }
}
