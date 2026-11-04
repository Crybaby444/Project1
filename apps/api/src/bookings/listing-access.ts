import { cents, type ListingPricing, type Period } from '@yoyo/domain';
import { AppError } from '../common/app-error';
import type { Listing, ListingPhoto, Prisma, User } from '../generated/prisma/client';
import { dayOf } from './booking.store';

export type BookableListing = Listing & { owner: User; photos: ListingPhoto[] };

const notFound = () => new AppError('NOT_FOUND', 404, 'Listing not found');

/**
 * A listing someone may ask to rent: published, with an owner who is neither blocked nor gone (review of
 * PR #3). One that was never public does not exist for others (404); one that was, but is not bookable
 * now, answers 409 LISTING_UNAVAILABLE.
 */
export async function bookableListing(tx: Prisma.TransactionClient, listingId: string): Promise<BookableListing> {
  const listing = await tx.listing.findUnique({ where: { id: listingId }, include: { owner: true, photos: true } });
  if (!listing || listing.publishedAt === null) throw notFound();
  if (listing.status !== 'PUBLISHED' || listing.owner.blockedAt !== null || listing.owner.deletedAt !== null || listing.dailyCents === null) {
    throw new AppError('LISTING_UNAVAILABLE', 409);
  }
  return listing;
}

export function pricingOf(listing: Listing): ListingPricing {
  return {
    dailyCents: cents(listing.dailyCents ?? 0),
    weeklyDiscountPercent: listing.weeklyDiscountPercent,
    depositCents: cents(listing.depositCents),
    minDays: listing.minDays,
    maxDays: listing.maxDays,
  };
}

/**
 * Days nobody else may take: other bookings' reservations (daterange `[start, end + 1)`) and the
 * owner's closed days, earliest first.
 */
export async function blockedPeriods(tx: Prisma.TransactionClient, listingId: string, exceptBookingId?: string): Promise<Period[]> {
  const reserved = await tx.$queryRaw<{ start: Date; end: Date }[]>`
    SELECT lower(reserved) AS "start", (upper(reserved) - 1) AS "end"
    FROM "Booking"
    WHERE "listingId" = ${listingId} AND reserved IS NOT NULL AND id <> ${exceptBookingId ?? ''}`;
  const closed = await tx.unavailability.findMany({ where: { listingId } });
  return [...reserved, ...closed]
    .map((p) => ({ start: dayOf(p.start), end: dayOf(p.end) }))
    .sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
}
