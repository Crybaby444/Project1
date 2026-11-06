import { Prisma, type Listing, type User } from '../generated/prisma/client';

/**
 * What the catalog shows (plan 7): a published listing with a price, of an owner who is neither blocked
 * nor gone. The same rule decides who may be asked to rent (bookableListing), searched, suggested,
 * favourited and shown on a profile. Three forms of one rule: keep them together.
 */
export const CATALOG_VISIBLE_WHERE = {
  status: 'PUBLISHED',
  dailyCents: { not: null },
  owner: { blockedAt: null, deletedAt: null },
} satisfies Prisma.ListingWhereInput;

/** The SQL form, for a query over `"Listing" l JOIN "User" u ON u."id" = l."ownerId"`. */
export const CATALOG_VISIBLE_SQL = Prisma.sql`l."status" = 'PUBLISHED' AND l."dailyCents" IS NOT NULL AND u."blockedAt" IS NULL AND u."deletedAt" IS NULL`;

export function isCatalogVisible(listing: Pick<Listing, 'status' | 'dailyCents'> & { owner: Pick<User, 'blockedAt' | 'deletedAt'> }): boolean {
  return listing.status === 'PUBLISHED' && listing.dailyCents !== null && listing.owner.blockedAt === null && listing.owner.deletedAt === null;
}

/**
 * Where a listing someone asks for stands (W03 §G): `available`; `away` — it was public and is not now
 * (hidden, back in review, owner blocked), so its page stays with similar items; `gone` — deleted, or
 * its owner left (410); `missing` — it never was public (404).
 */
export type CatalogState = 'available' | 'away' | 'gone' | 'missing';

export function catalogState(
  listing: (Pick<Listing, 'status' | 'dailyCents' | 'publishedAt'> & { owner: Pick<User, 'blockedAt' | 'deletedAt'> }) | null,
): CatalogState {
  if (!listing || listing.publishedAt === null) return 'missing';
  if (listing.status === 'ARCHIVED' || listing.owner.deletedAt !== null) return 'gone';
  return isCatalogVisible(listing) ? 'available' : 'away';
}
