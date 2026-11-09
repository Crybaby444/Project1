import { OwnerListingSchema, PublicListingSchema } from '@yoyo/shared';
import { describe, expect, it } from 'vitest';
import { Prisma } from '../generated/prisma/client';
import { serializeListing, type ListingWithRelations } from './listing.serializer';

const at = new Date('2026-11-04T10:00:00Z');

const row: ListingWithRelations = {
  id: 'l1',
  ownerId: 'u1',
  categoryId: 'c1',
  status: 'PUBLISHED',
  title: 'Bosch drill',
  description: 'A strong drill for concrete and wood.',
  condition: 'GOOD',
  attributes: { power: 'battery' },
  dailyCents: 1500,
  weeklyDiscountPercent: 10,
  depositCents: 5000,
  minDays: 1,
  maxDays: 14,
  city: 'Rīga',
  district: 'Centrs',
  lat: new Prisma.Decimal('56.949651'),
  lng: new Prisma.Decimal('24.105190'),
  timeZone: 'Europe/Riga',
  contentLocale: 'lv',
  rules: { preset: ['NO_SMOKING'], custom: ['Bring it back charged'] },
  rejectionReason: 'Earlier: blurry photos',
  submittedAt: at,
  reviewedAt: at,
  reviewedById: 'admin1',
  publishedAt: at,
  version: 3,
  createdAt: at,
  updatedAt: at,
  photos: [
    { id: 'p2', listingId: 'l1', storageKey: 'k2', width: 800, height: 600, bytes: 1000, format: 'webp', position: 1, createdAt: at },
    { id: 'p1', listingId: 'l1', storageKey: 'k1', width: 800, height: 600, bytes: 1000, format: 'webp', position: 0, createdAt: at },
  ],
  unavailability: [{ id: 'u1', listingId: 'l1', start: new Date('2026-12-01T00:00:00Z'), end: new Date('2026-12-05T00:00:00Z') }],
};

const urls = (key: string, variant: string) => `https://cdn.test/${variant}/${key}`;

describe('serializeListing', () => {
  it('shows the owner and the admin the exact point, the moderation data and the version', () => {
    for (const viewer of ['owner', 'admin'] as const) {
      const listing = OwnerListingSchema.parse(serializeListing(row, viewer, urls));
      expect(listing).toMatchObject({
        lat: 56.949651,
        lng: 24.10519,
        rejectionReason: 'Earlier: blurry photos',
        reviewedById: 'admin1',
        version: 3,
      });
    }
  });

  it('never gives anyone else the exact point, the rejection reason or the reviewer (only the district)', () => {
    const listing = serializeListing(row, 'public', urls);
    const text = JSON.stringify(listing);
    expect(listing).not.toHaveProperty('lat');
    expect(listing).not.toHaveProperty('lng');
    expect(listing).not.toHaveProperty('rejectionReason');
    expect(listing).not.toHaveProperty('reviewedById');
    expect(text).not.toContain('56.94');
    expect(text).not.toContain('24.10');
    expect(text).not.toContain('admin1');
    expect(PublicListingSchema.parse(listing)).toMatchObject({ district: 'Centrs', city: 'Rīga' });
  });

  it('orders photos by position (the first is the cover), with three sizes each, and writes dates as days', () => {
    const listing = serializeListing(row, 'owner', urls);
    expect(listing.photos.map((photo) => photo.id)).toEqual(['p1', 'p2']);
    expect(listing.photos[0]!.urls).toEqual({
      thumb: 'https://cdn.test/thumb/k1',
      card: 'https://cdn.test/card/k1',
      full: 'https://cdn.test/full/k1',
    });
    expect(listing.photos[0]).not.toHaveProperty('storageKey');
    expect(listing.unavailability).toEqual([{ start: '2026-12-01', end: '2026-12-05' }]);
  });
});
