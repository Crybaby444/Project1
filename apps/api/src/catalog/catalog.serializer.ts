import type { CatalogItem, Locale } from '@yoyo/shared';
import type { Listing, ListingPhoto } from '../generated/prisma/client';
import { byPosition, photoUrls, type UrlFor } from '../listings/listing.serializer';

/** A listing as its catalog card shows it. Fields one by one: never the point, the version or review data. */
export function serializeCatalogItem(listing: Listing & { photos: ListingPhoto[] }, urlFor: UrlFor): CatalogItem {
  const cover = [...listing.photos].sort(byPosition)[0];
  return {
    id: listing.id,
    title: listing.title ?? '',
    dailyCents: listing.dailyCents ?? 0,
    weeklyDiscountPercent: listing.weeklyDiscountPercent,
    depositCents: listing.depositCents,
    condition: listing.condition,
    city: listing.city,
    district: listing.district,
    categoryId: listing.categoryId,
    cover: cover ? photoUrls(cover.storageKey, urlFor) : null,
    ownerId: listing.ownerId,
    contentLocale: listing.contentLocale as Locale,
    publishedAt: listing.publishedAt?.toISOString() ?? null,
  };
}
