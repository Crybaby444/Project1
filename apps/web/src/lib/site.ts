/** Where the live site is. Canonical addresses, hreflang links, the sitemap and Open Graph use it. */
const LIVE_SITE = 'https://yoyo.rent';

/**
 * The site's own origin, without a trailing slash: SITE_ORIGIN (server-only, set on Vercel Production)
 * or the live domain. Previews and local builds also point search engines at the live site.
 */
export function resolveSiteUrl(configured: string | undefined): string {
  const value = configured?.trim().replace(/\/+$/, '');
  return value || LIVE_SITE;
}

export const SITE_URL = resolveSiteUrl(process.env.SITE_ORIGIN);

/** Public pages that search engines may index, in the order of the sitemap. */
export const PAGES = ['/', '/how-it-works', '/faq', '/terms', '/privacy', '/cookies'] as const;

export type SitePage = (typeof PAGES)[number];

/** The one address people write to: support, privacy requests, legal notices. */
export const CONTACT_EMAIL = 'admin@yoyo.rent';

/**
 * Where "List an item" leads a signed-in person: the listing builder. It comes with the listings
 * screens (plan 6b); until that is on the site this is null and the button is not shown (no dead
 * links). Guests are always offered "Create an account" first.
 */
export const LIST_ITEM_HREF: string | null = null;

/** Facts of the service the pages quote; one place, so the texts never disagree with each other. */
export const SERVICE_FACTS = {
  /** Service fee the renter pays on top of the rent, in percent. */
  serviceFeePercent: 10,
  /** Hours an owner has to answer a booking request before it expires. */
  requestHours: 24,
  /** Hours an owner has to check a returned item, and a renter to answer a damage claim. */
  checkHours: 48,
  /** Days both sides have to leave a review after a deal closes. */
  reviewDays: 14,
} as const;
