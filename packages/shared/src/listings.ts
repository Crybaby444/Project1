import { z } from 'zod';
import { cleanText } from './text';

/** Lifecycle of a listing; only the transition table of the API (`nextStatus`) moves between them. */
export const LISTING_STATUSES = ['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'HIDDEN', 'ARCHIVED'] as const;

export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const LISTING_CONDITIONS = ['NEW', 'LIKE_NEW', 'GOOD', 'FAIR'] as const;

export type ListingCondition = (typeof LISTING_CONDITIONS)[number];

/** Ready-made rules an owner ticks; the site labels them in every language (`listingRules.<KEY>`). */
export const RULE_PRESETS = ['ID_AT_PICKUP', 'RETURN_CLEAN', 'NO_SMOKING', 'PICKUP_ONLY', 'PETS_OK', 'CARE_INSTRUCTIONS'] as const;

export type RulePreset = (typeof RULE_PRESETS)[number];

export const LISTING_LIMITS = {
  title: { min: 5, max: 80 },
  description: { min: 30, max: 3000 },
  customRule: { min: 3, max: 120 },
  customRules: 5,
  place: 60,
  photos: 8,
  /** Bytes per uploaded photo. */
  photoBytes: 10 * 1024 * 1024,
  unavailablePeriods: 50,
} as const;

/** Sanity bounds for drafts; the real price rules (`PRICING_LIMITS` of @yoyo/domain) apply on submit. */
const DRAFT_INT_MAX = 1_000_000_000;

/**
 * A user's text: cleaned of HTML, at most `max` characters after cleaning, and an empty text clears
 * the field (null). Raw input is capped too, so nobody sends megabytes of markup.
 */
const OptionalText = (max: number) =>
  z
    .string()
    .max(max * 4)
    .transform(cleanText)
    .pipe(z.string().max(max))
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .optional();

const roundTo6 = (value: number) => Math.round(value * 1e6) / 1e6;

function isTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return value.includes('/') || value === 'UTC';
  } catch {
    return false;
  }
}

export const ListingRulesSchema = z.object({
  preset: z
    .array(z.enum(RULE_PRESETS))
    .max(RULE_PRESETS.length)
    .refine((presets) => new Set(presets).size === presets.length, 'Each rule only once'),
  custom: z
    .array(
      z
        .string()
        .max(LISTING_LIMITS.customRule.max * 4)
        .transform(cleanText)
        .pipe(z.string().min(LISTING_LIMITS.customRule.min).max(LISTING_LIMITS.customRule.max)),
    )
    .max(LISTING_LIMITS.customRules),
});

export type ListingRules = z.infer<typeof ListingRulesSchema>;

const DraftInt = (min: number) => z.number().int().min(min).max(DRAFT_INT_MAX);

/**
 * Any part of a listing, as the builder autosaves it. Every field is optional; null clears one. Texts
 * may still be short here (the minimum applies when the listing goes to review), never too long.
 * Attributes are checked against the category's definitions by the API.
 */
const ListingDraftObject = z.object({
  categoryId: z.string().min(1).max(64).nullable().optional(),
  title: OptionalText(LISTING_LIMITS.title.max),
  description: OptionalText(LISTING_LIMITS.description.max),
  condition: z.enum(LISTING_CONDITIONS).nullable().optional(),
  attributes: z.record(z.string().max(64), z.unknown()).optional(),
  dailyCents: DraftInt(0).nullable().optional(),
  weeklyDiscountPercent: z.number().int().min(0).max(100).optional(),
  depositCents: DraftInt(0).optional(),
  minDays: DraftInt(1).optional(),
  maxDays: DraftInt(1).optional(),
  city: OptionalText(LISTING_LIMITS.place),
  district: OptionalText(LISTING_LIMITS.place),
  lat: z.number().min(-90).max(90).transform(roundTo6).nullable().optional(),
  lng: z.number().min(-180).max(180).transform(roundTo6).nullable().optional(),
  timeZone: z.string().max(64).refine(isTimeZone, 'Unknown time zone').optional(),
  rules: ListingRulesSchema.optional(),
});

/** The point is lat and lng together: both numbers, both null (cleared) or both left out. */
function pointTogether(draft: { lat?: number | null; lng?: number | null }, ctx: z.RefinementCtx): void {
  if ((draft.lat === undefined) !== (draft.lng === undefined) || (draft.lat === null) !== (draft.lng === null)) {
    const missing = draft.lat === undefined || draft.lat === null ? 'lat' : 'lng';
    ctx.addIssue({ code: 'custom', path: [missing], message: 'Send lat and lng together' });
  }
}

export const ListingDraftSchema = ListingDraftObject.superRefine(pointTogether);

export type ListingDraft = z.infer<typeof ListingDraftSchema>;

/** A PATCH carries the version the client last saw: a stale one is refused (two tabs, one listing). */
export const ListingPatchSchema = ListingDraftObject.extend({ version: z.number().int().min(0) }).superRefine(pointTogether);

export type ListingPatch = z.infer<typeof ListingPatchSchema>;

const required = { error: 'Required' };

/**
 * The fields a listing needs before it goes to review. The API adds what a plain schema cannot see:
 * a leaf category, its required attributes, the price rules of @yoyo/domain and 1–8 photos.
 */
export const ListingSubmitSchema = z.object({
  title: z.string(required).min(LISTING_LIMITS.title.min).max(LISTING_LIMITS.title.max),
  description: z.string(required).min(LISTING_LIMITS.description.min).max(LISTING_LIMITS.description.max),
  condition: z.enum(LISTING_CONDITIONS, required),
  categoryId: z.string(required),
  dailyCents: z.number(required).int(),
  city: z.string(required).min(1),
  district: z.string(required).min(1),
  lat: z.number(required),
  lng: z.number(required),
});

/** A calendar day, `YYYY-MM-DD`. */
export const LocalDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

/** Days from `start` to `end`, both included. */
export const DatePeriodSchema = z.object({ start: LocalDateSchema, end: LocalDateSchema });

export type DatePeriod = z.infer<typeof DatePeriodSchema>;

export const PhotoUrlsSchema = z.object({
  /** 160×120, cropped to fill. */
  thumb: z.string(),
  /** 640×480, cropped to fill. */
  card: z.string(),
  /** The whole photo, at most 2048 px on the long side. */
  full: z.string(),
});

export type PhotoUrls = z.infer<typeof PhotoUrlsSchema>;

export const ListingPhotoSchema = z.object({
  id: z.string(),
  width: z.number().int(),
  height: z.number().int(),
  /** 0 is the cover. */
  position: z.number().int(),
  urls: PhotoUrlsSchema,
});

export type ListingPhoto = z.infer<typeof ListingPhotoSchema>;

/** What anyone may see of a listing (plan 7): the district, never the exact point. */
export const PublicListingSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  status: z.enum(LISTING_STATUSES),
  categoryId: z.string().nullable(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  condition: z.enum(LISTING_CONDITIONS).nullable(),
  attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  dailyCents: z.number().int().nullable(),
  weeklyDiscountPercent: z.number().int(),
  depositCents: z.number().int(),
  minDays: z.number().int(),
  maxDays: z.number().int(),
  city: z.string().nullable(),
  district: z.string().nullable(),
  timeZone: z.string(),
  rules: z.object({ preset: z.array(z.enum(RULE_PRESETS)), custom: z.array(z.string()) }),
  photos: z.array(ListingPhotoSchema),
  unavailability: z.array(DatePeriodSchema),
  publishedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type PublicListing = z.infer<typeof PublicListingSchema>;

/** The whole listing, for its owner and administrators only. */
export const OwnerListingSchema = PublicListingSchema.extend({
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  rejectionReason: z.string().nullable(),
  submittedAt: z.iso.datetime().nullable(),
  reviewedAt: z.iso.datetime().nullable(),
  reviewedById: z.string().nullable(),
  /** Send it back with every PATCH. */
  version: z.number().int(),
});

export type OwnerListing = z.infer<typeof OwnerListingSchema>;

export const OwnerListingResponseSchema = z.object({ listing: OwnerListingSchema });

export type OwnerListingResponse = z.infer<typeof OwnerListingResponseSchema>;

/** A row of "My listings". */
export const OwnerListingSummarySchema = z.object({
  id: z.string(),
  status: z.enum(LISTING_STATUSES),
  title: z.string().nullable(),
  categoryId: z.string().nullable(),
  dailyCents: z.number().int().nullable(),
  cover: PhotoUrlsSchema.nullable(),
  photoCount: z.number().int(),
  rejectionReason: z.string().nullable(),
  submittedAt: z.iso.datetime().nullable(),
  publishedAt: z.iso.datetime().nullable(),
  updatedAt: z.iso.datetime(),
  version: z.number().int(),
});

export type OwnerListingSummary = z.infer<typeof OwnerListingSummarySchema>;

export const MyListingsQuerySchema = z.object({ status: z.enum(LISTING_STATUSES).optional() });

export const MyListingsResponseSchema = z.object({ items: z.array(OwnerListingSummarySchema) });

export type MyListingsResponse = z.infer<typeof MyListingsResponseSchema>;
