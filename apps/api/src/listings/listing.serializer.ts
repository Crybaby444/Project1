import {
  type DatePeriod,
  type ListingRules,
  type OwnerListing,
  type OwnerListingSummary,
  type PhotoUrls,
  type PublicListing,
} from '@yoyo/shared';
import type { Listing, ListingPhoto, Unavailability } from '../generated/prisma/client';

export type ListingWithRelations = Listing & { photos: ListingPhoto[]; unavailability: Unavailability[] };

export type PhotoVariant = keyof PhotoUrls;

/** Where the storage serves one size of a stored photo. */
export type UrlFor = (storageKey: string, variant: PhotoVariant) => string;

/** Who looks at a listing: its owner, an administrator, or anyone else (plan 7). */
export type ListingViewer = 'owner' | 'admin' | 'public';

const iso = (date: Date | null) => date?.toISOString() ?? null;

/** `YYYY-MM-DD` of a `@db.Date` column (Prisma returns it as UTC midnight). */
export const dayOf = (date: Date) => date.toISOString().slice(0, 10);

export function photoUrls(storageKey: string, urlFor: UrlFor): PhotoUrls {
  return { thumb: urlFor(storageKey, 'thumb'), card: urlFor(storageKey, 'card'), full: urlFor(storageKey, 'full') };
}

/** Photos in their order: the cover first. */
export const byPosition = (a: ListingPhoto, b: ListingPhoto) => a.position - b.position;

export function serializePhoto(photo: ListingPhoto, urlFor: UrlFor) {
  return { id: photo.id, width: photo.width, height: photo.height, position: photo.position, urls: photoUrls(photo.storageKey, urlFor) };
}

export function serializePeriods(periods: Unavailability[]): DatePeriod[] {
  return [...periods]
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .map((period) => ({ start: dayOf(period.start), end: dayOf(period.end) }));
}

/**
 * The listing as `viewer` may see it. Only the owner and administrators get the exact point
 * (lat, lng), the rejection reason, the reviewer and the version; everyone else gets the district.
 * Fields are listed one by one, so a new column never leaks by accident.
 */
export function serializeListing(listing: ListingWithRelations, viewer: 'owner' | 'admin', urlFor: UrlFor): OwnerListing;
export function serializeListing(listing: ListingWithRelations, viewer: 'public', urlFor: UrlFor): PublicListing;
export function serializeListing(listing: ListingWithRelations, viewer: ListingViewer, urlFor: UrlFor): OwnerListing | PublicListing;
export function serializeListing(listing: ListingWithRelations, viewer: ListingViewer, urlFor: UrlFor): OwnerListing | PublicListing {
  const shown: PublicListing = {
    id: listing.id,
    ownerId: listing.ownerId,
    status: listing.status,
    categoryId: listing.categoryId,
    title: listing.title,
    description: listing.description,
    condition: listing.condition,
    attributes: listing.attributes as PublicListing['attributes'],
    dailyCents: listing.dailyCents,
    weeklyDiscountPercent: listing.weeklyDiscountPercent,
    depositCents: listing.depositCents,
    minDays: listing.minDays,
    maxDays: listing.maxDays,
    city: listing.city,
    district: listing.district,
    timeZone: listing.timeZone,
    contentLocale: listing.contentLocale as PublicListing['contentLocale'],
    rules: listing.rules as ListingRules,
    photos: [...listing.photos].sort(byPosition).map((photo) => serializePhoto(photo, urlFor)),
    unavailability: serializePeriods(listing.unavailability),
    publishedAt: iso(listing.publishedAt),
    createdAt: listing.createdAt.toISOString(),
    updatedAt: listing.updatedAt.toISOString(),
  };
  if (viewer === 'public') return shown;
  return {
    ...shown,
    lat: listing.lat === null ? null : listing.lat.toNumber(),
    lng: listing.lng === null ? null : listing.lng.toNumber(),
    rejectionReason: listing.rejectionReason,
    submittedAt: iso(listing.submittedAt),
    reviewedAt: iso(listing.reviewedAt),
    reviewedById: listing.reviewedById,
    version: listing.version,
  };
}

export function serializeSummary(listing: Listing & { photos: ListingPhoto[] }, urlFor: UrlFor): OwnerListingSummary {
  const cover = [...listing.photos].sort(byPosition)[0];
  return {
    id: listing.id,
    status: listing.status,
    title: listing.title,
    categoryId: listing.categoryId,
    dailyCents: listing.dailyCents,
    cover: cover ? photoUrls(cover.storageKey, urlFor) : null,
    photoCount: listing.photos.length,
    rejectionReason: listing.rejectionReason,
    submittedAt: iso(listing.submittedAt),
    publishedAt: iso(listing.publishedAt),
    updatedAt: listing.updatedAt.toISOString(),
    version: listing.version,
  };
}
