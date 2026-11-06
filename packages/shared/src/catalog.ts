import { z } from 'zod';
import { LocalizedTextSchema, STICKERS } from './categories';
import { DatePeriodSchema, LISTING_CONDITIONS, PhotoUrlsSchema, PublicListingSchema } from './listings';
import { LOCALES } from './locale';
import { cleanText } from './text';

/** Items on one page of the catalog. */
export const CATALOG_PAGE_SIZE = 24;

/** At most this many items are put on the map; a wider search is cut and says so (`truncated`). */
export const CATALOG_MAP_LIMIT = 500;

/** Sorts of the catalog. `relevance` needs a search text; without one the default is `new`. */
export const CATALOG_SORTS = ['new', 'price_asc', 'price_desc', 'relevance'] as const;

export type CatalogSort = (typeof CATALOG_SORTS)[number];

export const CATALOG_LIMITS = {
  q: 100,
  place: 60,
  /** Longest period of the free-dates filter, in days. */
  periodDays: 365,
  /** Highest page number anyone can ask for. */
  page: 1000,
} as const;

const MAX_CENTS = 1_000_000_000;

const YYYY_MM_DD = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Days since 1970-01-01 of a real `YYYY-MM-DD`, or null when there is no such day. */
export function dayIndex(value: string): number | null {
  const match = YYYY_MM_DD.exec(value);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const time = Date.UTC(year, month - 1, day);
  const date = new Date(time);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return time / 86_400_000;
}

const Day = z.string().refine((value) => dayIndex(value) !== null, 'Use an existing day, YYYY-MM-DD');

const Cents = z.coerce.number().int().min(0).max(MAX_CENTS);

/** A short text typed into a search or filter: cleaned, at most `max` characters; empty means "not given". */
const SearchText = (max: number) =>
  z
    .string()
    .max(max * 4)
    .transform(cleanText)
    .pipe(z.string().max(max))
    .transform((value) => (value === '' ? undefined : value))
    .optional();

/**
 * What the catalog is asked for (spec §4.1), as it travels in a query string: the API's
 * `GET /catalog/listings` and `/catalog/map`, and the site's own address bar. Dates are checked
 * against today by the API, which has the clock.
 */
export const CatalogQuerySchema = z
  .object({
    q: SearchText(CATALOG_LIMITS.q),
    /** A category slug; its subcategories are included. */
    category: z.string().max(80).regex(/^[a-z0-9-]+$/).optional(),
    /** Daily price range, in cents. */
    priceMin: Cents.optional(),
    priceMax: Cents.optional(),
    depositMax: Cents.optional(),
    /** One or more conditions, comma-separated: `NEW,LIKE_NEW`. */
    condition: z
      .string()
      .max(100)
      .transform((value) => value.split(',').filter(Boolean))
      .pipe(z.array(z.enum(LISTING_CONDITIONS)).min(1).max(LISTING_CONDITIONS.length))
      .optional(),
    /** Free on every day from `start` to `end`, both included. */
    start: Day.optional(),
    end: Day.optional(),
    city: SearchText(CATALOG_LIMITS.place),
    district: SearchText(CATALOG_LIMITS.place),
    sort: z.enum(CATALOG_SORTS).optional(),
    page: z.coerce.number().int().min(1).max(CATALOG_LIMITS.page).default(1),
  })
  .superRefine((query, ctx) => {
    if (query.start !== undefined && query.end === undefined) {
      ctx.addIssue({ code: 'custom', path: ['end'], message: 'Give both days' });
    }
    if (query.end !== undefined && query.start === undefined) {
      ctx.addIssue({ code: 'custom', path: ['start'], message: 'Give both days' });
    }
    if (query.start !== undefined && query.end !== undefined) {
      const start = dayIndex(query.start);
      const end = dayIndex(query.end);
      if (start !== null && end !== null) {
        if (end < start) ctx.addIssue({ code: 'custom', path: ['end'], message: 'Ends before it starts' });
        else if (end - start + 1 > CATALOG_LIMITS.periodDays) {
          ctx.addIssue({ code: 'custom', path: ['end'], message: `At most ${CATALOG_LIMITS.periodDays} days` });
        }
      }
    }
    if (query.priceMin !== undefined && query.priceMax !== undefined && query.priceMax < query.priceMin) {
      ctx.addIssue({ code: 'custom', path: ['priceMax'], message: 'Below the lowest price' });
    }
  });

export type CatalogQuery = z.infer<typeof CatalogQuerySchema>;

/** One item in the catalog: what its card shows, and never the exact point. */
export const CatalogItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  dailyCents: z.number().int(),
  weeklyDiscountPercent: z.number().int(),
  depositCents: z.number().int(),
  condition: z.enum(LISTING_CONDITIONS).nullable(),
  city: z.string().nullable(),
  district: z.string().nullable(),
  categoryId: z.string().nullable(),
  cover: PhotoUrlsSchema.nullable(),
  ownerId: z.string(),
  contentLocale: z.enum(LOCALES),
  publishedAt: z.iso.datetime().nullable(),
});

export type CatalogItem = z.infer<typeof CatalogItemSchema>;

export const CatalogPageSchema = z.object({
  items: z.array(CatalogItemSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});

export type CatalogPage = z.infer<typeof CatalogPageSchema>;

/**
 * Items of one cell of a 0.01° grid (about 1.1 × 0.6 km in Riga), placed at the middle of the cell:
 * the map is never more exact than the district.
 */
export const MapPinSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  count: z.number().int(),
  /** The first few items of the cell, cheapest first. */
  items: z.array(
    z.object({ id: z.string(), title: z.string(), dailyCents: z.number().int(), cover: PhotoUrlsSchema.nullable() }),
  ),
});

export type MapPin = z.infer<typeof MapPinSchema>;

export const MapResponseSchema = z.object({
  pins: z.array(MapPinSchema),
  /** Items found, on the map or not. */
  total: z.number().int(),
  /** More items matched than CATALOG_MAP_LIMIT; the map shows the first ones. */
  truncated: z.boolean(),
});

export type MapResponse = z.infer<typeof MapResponseSchema>;

export const SuggestQuerySchema = z.object({
  q: z.string().max(400).transform(cleanText).pipe(z.string().min(2).max(CATALOG_LIMITS.q)),
  /** The language category names are matched and shown in first. */
  lang: z.enum(LOCALES).default('en'),
});

export const SuggestResponseSchema = z.object({
  categories: z.array(z.object({ slug: z.string(), names: LocalizedTextSchema, sticker: z.enum(STICKERS) })),
  listings: z.array(z.object({ id: z.string(), title: z.string(), cover: PhotoUrlsSchema.nullable() })),
});

export type SuggestResponse = z.infer<typeof SuggestResponseSchema>;

/** Cities and their districts that have items in the catalog, for the place filter. */
export const PlacesResponseSchema = z.object({
  cities: z.array(
    z.object({
      city: z.string(),
      count: z.number().int(),
      districts: z.array(z.object({ district: z.string(), count: z.number().int() })),
    }),
  ),
});

export type PlacesResponse = z.infer<typeof PlacesResponseSchema>;

/** Someone as everyone may see them: no email, no phone number. */
export const OwnerSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  city: z.string().nullable(),
  /** When the account was made (the site shows the month). */
  memberSince: z.iso.datetime(),
  emailVerified: z.boolean(),
  phoneVerified: z.boolean(),
  /** Finished deals, as owner or as renter. */
  completedDeals: z.number().int(),
  /** Items in the catalog. */
  listingCount: z.number().int(),
  /** Average review score; reviews arrive with plan 10, until then always null. */
  rating: z.number().nullable(),
});

export type OwnerSummary = z.infer<typeof OwnerSummarySchema>;

export const ItemDetailSchema = z.object({
  listing: PublicListingSchema,
  owner: OwnerSummarySchema,
  /** Days nobody can book: other people's bookings and the days the owner closed, from today on. */
  blocked: z.array(DatePeriodSchema),
  /** What the price calculator needs to match the API's own quote. */
  booking: z.object({
    servicePercent: z.number().int(),
    maxAdvanceDays: z.number().int(),
    /** Today where the item is (its time zone). */
    today: z.string(),
  }),
});

export type ItemDetail = z.infer<typeof ItemDetailSchema>;

export const PublicProfileSchema = z.object({
  user: OwnerSummarySchema.extend({ about: z.string().nullable() }),
  listings: z.array(CatalogItemSchema),
});

export type PublicProfile = z.infer<typeof PublicProfileSchema>;

export const FavoriteIdsResponseSchema = z.object({ ids: z.array(z.string()) });

export type FavoriteIdsResponse = z.infer<typeof FavoriteIdsResponseSchema>;

/** A favourite that left the catalog (hidden, archived, owner blocked) stays listed, `available: false`. */
export const FavoriteItemSchema = CatalogItemSchema.extend({ available: z.boolean() });

export type FavoriteItem = z.infer<typeof FavoriteItemSchema>;

export const FavoritesResponseSchema = z.object({ items: z.array(FavoriteItemSchema) });

export type FavoritesResponse = z.infer<typeof FavoritesResponseSchema>;

/** Everything a sitemap lists: only what the catalog shows. */
export const SitemapResponseSchema = z.object({
  listings: z.array(z.object({ id: z.string(), contentLocale: z.enum(LOCALES), updatedAt: z.iso.datetime() })),
  /** Owners with at least one item in the catalog. */
  users: z.array(z.object({ id: z.string(), updatedAt: z.iso.datetime() })),
  categories: z.array(z.object({ slug: z.string(), slugs: LocalizedTextSchema, count: z.number().int() })),
});

export type SitemapResponse = z.infer<typeof SitemapResponseSchema>;

/** A category page is indexed only once it holds at least this many items (owner's SEO rule). */
export const CATEGORY_INDEX_MIN_ITEMS = 3;
