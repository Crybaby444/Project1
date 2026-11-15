import { z } from 'zod';

/**
 * One page view from the site's own counter (cookieless): the path without its language prefix or query,
 * where the visit came from (only on the first page of a visit), and an optional search on that page.
 */
export const AnalyticsHitSchema = z.object({
  path: z.string().min(1).max(300).regex(/^\//),
  /** The first page of a visit (a fresh load), with where it came from; later pages are not entries. */
  entry: z.boolean().default(false),
  referrer: z.string().max(500).default(''),
  locale: z.string().max(5).default(''),
  /** A search shown on this page: its words and how many items it found. */
  search: z.object({ q: z.string().trim().min(1).max(100), results: z.number().int().min(0) }).optional(),
});
export type AnalyticsHit = z.infer<typeof AnalyticsHitSchema>;

const Row = z.object({ key: z.string(), value: z.number().int() });

/** The admin panel's traffic screen. */
export const AdminAnalyticsSchema = z.object({
  days: z.number().int(),
  totals: z.object({ views: z.number().int(), visits: z.number().int() }),
  series: z.array(z.object({ day: z.string(), views: z.number().int(), visits: z.number().int() })),
  pages: z.array(Row),
  sources: z.array(Row),
  devices: z.array(Row),
  locales: z.array(Row),
  searches: z.array(Row),
  emptySearches: z.array(Row),
  /** Item views → booking requests → sign-ups over the period. */
  funnel: z.object({ itemViews: z.number().int(), requests: z.number().int(), signups: z.number().int() }),
});
export type AdminAnalytics = z.infer<typeof AdminAnalyticsSchema>;

/** One published item with what holds it back in search and on the page. */
export const SeoIssueSchema = z.enum(['SHORT_TITLE', 'LONG_TITLE', 'SHORT_DESCRIPTION', 'FEW_PHOTOS', 'NO_DISTRICT']);
export const AdminSeoSchema = z.object({
  published: z.number().int(),
  healthy: z.number().int(),
  issues: z.array(z.object({ key: SeoIssueSchema, value: z.number().int() })),
  listings: z.array(z.object({ id: z.string(), title: z.string(), score: z.number().int(), issues: z.array(SeoIssueSchema) })),
});
export type AdminSeo = z.infer<typeof AdminSeoSchema>;
