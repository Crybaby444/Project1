import { CATEGORY_INDEX_MIN_ITEMS, LOCALES, type SitemapResponse } from '@yoyo/shared';
import { LEGAL_EFFECTIVE_DATE } from '@/content/legal/types';
import { alternates, categoryPath, localePath } from './seo';
import { PAGES } from './site';

/**
 * The sitemaps (W03 §J): `sitemap.xml` is an index of three, each only with addresses that are
 * canonical and indexable: the site's own pages (every language, with their language variants),
 * the categories with at least 3 items (each language at its own slug), and every item at its one
 * address in its own language. Items and categories carry `loc` and `lastmod` only.
 */
export const SITEMAPS = ['sitemap-pages.xml', 'sitemap-categories.xml', 'sitemap-listings.xml'] as const;

export type SitemapUrl = { loc: string; lastmod?: string; alternates?: Record<string, string> };

const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const day = (iso: string) => iso.slice(0, 10);

export function sitemapIndex(origin: string, lastmod?: string): string {
  const entries = SITEMAPS.map(
    (name) => `<sitemap><loc>${escape(`${origin}/${name}`)}</loc>${lastmod ? `<lastmod>${day(lastmod)}</lastmod>` : ''}</sitemap>`,
  ).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</sitemapindex>\n`;
}

export function urlset(urls: SitemapUrl[]): string {
  const withAlternates = urls.some((url) => url.alternates);
  const body = urls
    .map((url) => {
      const links = Object.entries(url.alternates ?? {})
        .map(([hreflang, href]) => `<xhtml:link rel="alternate" hreflang="${hreflang}" href="${escape(href)}"/>`)
        .join('');
      return `<url><loc>${escape(url.loc)}</loc>${url.lastmod ? `<lastmod>${day(url.lastmod)}</lastmod>` : ''}${links}</url>`;
    })
    .join('');
  const xhtml = withAlternates ? ' xmlns:xhtml="http://www.w3.org/1999/xhtml"' : '';
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${xhtml}>${body}</urlset>\n`;
}

/** The site's own pages (home, how it works, FAQ, the documents) in every language. */
export function pageUrls(origin: string): SitemapUrl[] {
  return PAGES.flatMap((path) =>
    LOCALES.map((locale) => {
      const links = alternates(path, locale, origin);
      return { loc: links.canonical, lastmod: LEGAL_EFFECTIVE_DATE, alternates: links.languages };
    }),
  );
}

/** The catalog index in every language, and each category that holds enough items to be indexed. */
export function categoryUrls(origin: string, categories: SitemapResponse['categories']): SitemapUrl[] {
  const index = LOCALES.map((locale) => ({ loc: `${origin}${localePath(locale, '/c')}` }));
  const indexed = categories.filter((category) => category.count >= CATEGORY_INDEX_MIN_ITEMS);
  return [...index, ...indexed.flatMap((category) => LOCALES.map((locale) => ({ loc: `${origin}${localePath(locale, categoryPath(category.slugs[locale]))}` })))];
}

/** Every item in the catalog, once: at its address in its own language. */
export function listingUrls(origin: string, listings: SitemapResponse['listings']): SitemapUrl[] {
  return listings.map((listing) => ({
    loc: `${origin}${localePath(listing.contentLocale, `/listings/${listing.id}-${listing.slug}`)}`,
    lastmod: listing.updatedAt,
  }));
}

/** An XML answer; search engines may keep it for an hour. */
export function xmlResponse(xml: string, status = 200): Response {
  return new Response(xml, {
    status,
    headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=0, s-maxage=3600' },
  });
}
