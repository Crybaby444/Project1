import { CountrySchema } from './countries';
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
    /** Free on every day from `start` to `end`, both included. */
    start: Day.optional(),
    end: Day.optional(),
    /** A district's slug (`slugify` of its name, as `GET /catalog/places` gives it). */
    district: z.string().max(CATALOG_LIMITS.place).regex(/^[a-z0-9-]+$/).optional(),
    /** Only items in this country (owner, 2026-11-16: nobody in Riga rents from Paris). */
    country: CountrySchema.optional(),
    /** A city's slug within the country (`slugify` of its name, as `GET /catalog/places` gives it). */
    city: z.string().max(CATALOG_LIMITS.place).regex(/^[a-z0-9-]+$/).optional(),
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
  country: z.string().nullable(),
  categoryId: z.string().nullable(),
  cover: PhotoUrlsSchema.nullable(),
  ownerId: z.string(),
  contentLocale: z.enum(LOCALES),
  publishedAt: z.iso.datetime().nullable(),
  /** The average of the renters' item stars in public reviews (one decimal), or null with none. */
  rating: z.number().nullable(),
  reviewCount: z.number().int(),
  /** An example listing (owner, 2026-11-16): shown with a mark, cannot be booked. */
  demo: z.boolean(),
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
  categories: z.array(z.object({ slug: z.string(), slugs: LocalizedTextSchema, names: LocalizedTextSchema, sticker: z.enum(STICKERS) })),
  listings: z.array(z.object({ id: z.string(), title: z.string(), cover: PhotoUrlsSchema.nullable() })),
});

export type SuggestResponse = z.infer<typeof SuggestResponseSchema>;

/** Districts that have items in the catalog, for the place filter (W03: one city, districts as a filter). */
export const PlacesResponseSchema = z.object({
  /** Countries that have items, most first. */
  countries: z.array(z.object({ country: z.string(), count: z.number().int() })),
  /** Cities with items (in the asked country, or everywhere), most first. */
  cities: z.array(z.object({ city: z.string(), slug: z.string(), count: z.number().int() })),
  districts: z.array(z.object({ district: z.string(), slug: z.string(), count: z.number().int() })),
});

export const PlacesQuerySchema = z.object({ country: CountrySchema.optional() });

export type PlacesResponse = z.infer<typeof PlacesResponseSchema>;

/**
 * The home's "For you" (owner, 2026-11-16: by interests or popularity, not the raw newest). `categories`:
 * what this browser looked at lately (category ids), so a visitor gets a personal list too.
 */
export const ForYouQuerySchema = z.object({
  country: CountrySchema.optional(),
  categories: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => (v === undefined ? [] : (Array.isArray(v) ? v : v.split(',')).filter(Boolean).slice(0, 12))),
});
export type ForYouQuery = z.infer<typeof ForYouQuerySchema>;

/** Items by id (the browser's "recently viewed"): only those still visible come back, as they are now. */
export const CatalogItemsQuerySchema = z.object({
  ids: z
    .union([z.string(), z.array(z.string())])
    .transform((v) => [...new Set((Array.isArray(v) ? v : v.split(',')).map((id) => id.trim()).filter((id) => /^[a-z0-9-]{1,40}$/i.test(id)))].slice(0, 24)),
});
export type CatalogItemsQuery = z.infer<typeof CatalogItemsQuerySchema>;
export const CatalogItemsResponseSchema = z.object({ items: z.array(CatalogItemSchema) });
export type CatalogItemsResponse = z.infer<typeof CatalogItemsResponseSchema>;
export const ForYouResponseSchema = z.object({
  /** At most 12, best first; `personal` says whether interests shaped the list (else it is "popular now"). */
  items: z.array(CatalogItemSchema),
  personal: z.boolean(),
});
export type ForYouResponse = z.infer<typeof ForYouResponseSchema>;
/** Typing a city (owner, 2026-11-16: every city of the country, not only those with items). */
export const CitySuggestQuerySchema = z.object({ country: CountrySchema, q: z.string().trim().min(1).max(60) });
export const CitySuggestResponseSchema = z.object({
  /** At most 8, best first; `count` is how many items the city has now. */
  items: z.array(z.object({ name: z.string(), slug: z.string(), count: z.number().int().min(0) })),
});
export type CitySuggestResponse = z.infer<typeof CitySuggestResponseSchema>;

/** Someone as everyone may see them: no email, no phone number. */
export const OwnerSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string().min(1).nullable(),
  city: z.string().nullable(),
  /** When the account was made (the site shows the month). */
  memberSince: z.iso.datetime(),
  emailVerified: z.boolean(),
  phoneVerified: z.boolean(),
  /** A moderator has confirmed who this is (identity check). */
  identityVerified: z.boolean(),
  /** Finished deals, as owner or as renter. */
  completedDeals: z.number().int(),
  /** Items in the catalog. */
  listingCount: z.number().int(),
  /** The average of the public reviews about them (one decimal), or null with none. */
  rating: z.number().nullable(),
  /** How many public reviews are about them. */
  reviewCount: z.number().int(),
  /** How long they usually take to answer a message (median minutes, last 90 days), or null with too few answers. */
  responseMinutes: z.number().int().nullable(),
});

export type OwnerSummary = z.infer<typeof OwnerSummarySchema>;

/** An item that can be rented now: the whole public listing, its owner and what the calculator needs. */
export const AvailableItemSchema = z.object({
  available: z.literal(true),
  /** An example listing: the page shows it as such and offers no booking. */
  demo: z.boolean(),
  listing: PublicListingSchema,
  owner: OwnerSummarySchema,
  /** The renters' item stars in public reviews (one decimal), or null with none. */
  rating: z.number().nullable(),
  reviewCount: z.number().int(),
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

/**
 * An item that was public and is away for now (hidden by its owner, back in review, owner blocked):
 * the page stays, `noindex`, with similar items (W03 §G). Nothing that could be out of date is sent.
 */
export const UnavailableItemSchema = z.object({
  available: z.literal(false),
  listing: z.object({
    id: z.string(),
    title: z.string(),
    categoryId: z.string().nullable(),
    contentLocale: z.enum(LOCALES),
  }),
});

export const ItemDetailSchema = z.discriminatedUnion('available', [AvailableItemSchema, UnavailableItemSchema]);

export type ItemDetail = z.infer<typeof ItemDetailSchema>;

export const ItemResponseSchema = z.object({ item: ItemDetailSchema });

export type ItemResponse = z.infer<typeof ItemResponseSchema>;
export type AvailableItem = z.infer<typeof AvailableItemSchema>;

/**
 * Where an item's page lives: the site's proxy asks before every item page, to send a wrong slug to the
 * right address (301) and answer 410 for a removed item.
 */
export const ItemAddressSchema = z.object({
  slug: z.string(),
  contentLocale: z.enum(LOCALES),
  available: z.boolean(),
});

export type ItemAddress = z.infer<typeof ItemAddressSchema>;

export const PublicProfileSchema = z.object({
  user: OwnerSummarySchema.extend({ about: z.string().nullable(), followers: z.number().int(), following: z.number().int() }),
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
  /** Each at its canonical address: `/listings/{id}-{slug}` in its own language. */
  listings: z.array(z.object({ id: z.string(), slug: z.string(), contentLocale: z.enum(LOCALES), updatedAt: z.iso.datetime() })),
  /** Owners with at least one item in the catalog. */
  users: z.array(z.object({ id: z.string(), updatedAt: z.iso.datetime() })),
  categories: z.array(z.object({ slug: z.string(), slugs: LocalizedTextSchema, count: z.number().int() })),
});

export type SitemapResponse = z.infer<typeof SitemapResponseSchema>;

/** A category page is indexed only once it holds at least this many items (owner's SEO rule). */
export const CATEGORY_INDEX_MIN_ITEMS = 3;

/** How many visible items each category holds (only categories with any), for the catalog index. */
export const CategoryCountsSchema = z.object({
  counts: z.record(z.string(), z.number().int().min(0)),
  /** Per top-level category id: the covers of its newest items with a photo, newest first (thumb and card). */
  covers: z.record(z.string(), z.array(z.object({ thumb: z.string(), card: z.string() }))).optional(),
});
export type CategoryCounts = z.infer<typeof CategoryCountsSchema>;

/** A person in search results and follow lists: enough for a card that leads to their profile. */
export const PersonCardSchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string().min(1).nullable(),
  city: z.string().nullable(),
  listingCount: z.number().int(),
  followers: z.number().int(),
  rating: z.number().nullable(),
  reviewCount: z.number().int(),
});
export type PersonCard = z.infer<typeof PersonCardSchema>;
export const PeopleResponseSchema = z.object({ items: z.array(PersonCardSchema) });
export type PeopleResponse = z.infer<typeof PeopleResponseSchema>;
export const PeopleSearchQuerySchema = z.object({ q: z.string().trim().transform((v) => v.replace(/^@/, '')).pipe(z.string().min(2).max(60)) });

/** Ids of the people the signed-in person follows (for the Follow buttons). */
export const FollowingIdsSchema = z.object({ ids: z.array(z.string()) });

/** New items from the people you follow, newest first. */
export const FollowFeedSchema = z.object({
  items: z.array(CatalogItemSchema.extend({ owner: z.object({ id: z.string(), name: z.string() }) })),
  total: z.number().int(),
});
export type FollowFeed = z.infer<typeof FollowFeedSchema>;
export const FollowFeedQuerySchema = z.object({ page: z.coerce.number().int().min(1).max(100).default(1) });

/** A shop: a person's collection of their own items under a name (owner, 2026-11-16). */
export const SHOP_LIMITS = { perUser: 20, items: 100, name: 60, about: 500 } as const;
export const ShopSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  about: z.string().nullable(),
  categoryId: z.string().min(1).nullable(),
  /** Items in it that the catalog shows. */
  itemCount: z.number().int(),
  /** Up to three cover photos of its items. */
  covers: z.array(z.string()),
});
export type ShopSummary = z.infer<typeof ShopSummarySchema>;
export const ShopsResponseSchema = z.object({ items: z.array(ShopSummarySchema) });
export const ShopResponseSchema = z.object({
  shop: ShopSummarySchema,
  owner: z.object({ id: z.string(), name: z.string(), username: z.string().min(1).nullable() }),
  items: z.array(CatalogItemSchema),
});
export type ShopResponse = z.infer<typeof ShopResponseSchema>;
/** My shop, for editing: every item id in it, in order (whatever their status). */
export const MyShopSchema = ShopSummarySchema.extend({ listingIds: z.array(z.string()) });
export type MyShop = z.infer<typeof MyShopSchema>;
export const MyShopsResponseSchema = z.object({ items: z.array(MyShopSchema) });
export const ShopInputSchema = z.object({
  name: z.string().trim().min(2).max(SHOP_LIMITS.name),
  about: z.string().trim().max(SHOP_LIMITS.about).nullable().optional(),
  categoryId: z.string().min(1).nullable().optional(),
  /** My own items, in the order the shop shows them. */
  listingIds: z.array(z.string().min(1)).max(SHOP_LIMITS.items).optional(),
});
export type ShopInput = z.infer<typeof ShopInputSchema>;
