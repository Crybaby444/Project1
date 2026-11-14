import type { AvailableItem, CatalogItem, OwnerListing } from '@yoyo/shared';
import { ownerListing } from './listings';

/** A published item as the item page gets it: 15 € a day, −10 % for a week, 50 € deposit. */
export function availableItem(overrides: Partial<AvailableItem['listing']> = {}): AvailableItem {
  const owned: Partial<OwnerListing> = ownerListing({
    id: 'cm1abcdefg',
    ownerId: 'owner-1',
    status: 'PUBLISHED',
    title: 'Cordless drill',
    description: 'Two batteries and a case.',
    dailyCents: 1500,
    weeklyDiscountPercent: 10,
    depositCents: 5000,
    city: 'Rīga',
    district: 'Centrs',
    photos: [
      { id: 'p1', width: 800, height: 600, position: 0, urls: { thumb: '/t1', card: '/c1', full: '/f1' } },
      { id: 'p2', width: 800, height: 600, position: 1, urls: { thumb: '/t2', card: '/c2', full: '/f2' } },
      { id: 'p3', width: 800, height: 600, position: 2, urls: { thumb: '/t3', card: '/c3', full: '/f3' } },
    ],
    publishedAt: '2026-11-01T10:00:00.000Z',
  });
  // What only the owner sees never reaches the item page.
  for (const key of ['lat', 'lng', 'rejectionReason', 'submittedAt', 'reviewedAt', 'reviewedById', 'version'] as const) delete owned[key];
  const listing = owned as AvailableItem['listing'];
  return {
    available: true,
    listing: { ...listing, ...overrides },
    owner: {
      id: 'owner-1',
      name: 'Jānis Ozols',
      city: 'Rīga',
      memberSince: '2026-03-01T10:00:00.000Z',
      emailVerified: true,
      phoneVerified: false,
      completedDeals: 2,
      listingCount: 1,
      rating: null,
      reviewCount: 0,
    },
    rating: null,
    reviewCount: 0,
    blocked: [{ start: '2026-12-10', end: '2026-12-11' }],
    booking: { servicePercent: 10, maxAdvanceDays: 180, today: '2026-12-01' },
  };
}

export function catalogItem(overrides: Partial<CatalogItem> = {}): CatalogItem {
  return {
    id: 'cm1abcdefg',
    title: 'Cordless drill',
    dailyCents: 1500,
    weeklyDiscountPercent: 10,
    depositCents: 5000,
    condition: 'GOOD',
    city: 'Rīga',
    district: 'Centrs',
    categoryId: 'cat-1',
    cover: { thumb: '/t', card: '/c', full: '/f' },
    ownerId: 'owner-1',
    contentLocale: 'en',
    publishedAt: '2026-11-01T10:00:00.000Z',
    rating: null,
    reviewCount: 0,
    ...overrides,
  };
}
