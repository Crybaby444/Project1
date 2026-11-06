import { CATEGORY_INDEX_MIN_ITEMS, LOCALES, listingSlug, type Locale, type LocalizedText } from '@yoyo/shared';
import type { Metadata } from 'next';
import { hasFilters, type CatalogParams } from './catalog/params';

/**
 * Where the site lives, for absolute addresses (canonical, sitemaps, JSON-LD): SITE_ORIGIN in
 * production (plan 5), the local site otherwise.
 */
export function siteOrigin(): string {
  return (process.env.SITE_ORIGIN?.trim() || 'http://localhost:3000').replace(/\/+$/, '');
}

/** A path on one language's site: English has no prefix (`/c`), the others do (`/lv/c`). */
export function localePath(locale: Locale, path: string): string {
  const clean = path === '/' ? '' : path;
  return locale === 'en' ? clean || '/' : `/${locale}${clean}`;
}

/** `/listings/{id}-{slug}` (W03 §D): the slug from the title in the language it is written in. */
export function listingPath(id: string, title: string | null): string {
  return `/listings/${id}-${listingSlug(title)}`;
}

export const categoryPath = (slug: string) => `/c/${slug}`;

export const profilePath = (id: string) => `/u/${id}`;

type Robots = { index: boolean; follow: boolean };

const INDEX: Robots = { index: true, follow: true };
const NOINDEX: Robots = { index: false, follow: true };

/**
 * An item page under any language: canonical is the address in the item's own language, there are no
 * hreflang variants, and the page's language is that one too (owner's decision, W02 §G). An item away
 * for now stays, not indexed (W03 §G).
 */
export function itemSeo(listing: { id: string; title: string | null; contentLocale: Locale }, available: boolean) {
  return {
    canonical: localePath(listing.contentLocale, listingPath(listing.id, listing.title)),
    htmlLang: listing.contentLocale,
    robots: available ? INDEX : NOINDEX,
  };
}

/**
 * A category page (W03 §G, §H): filters, sorts and the map are not indexed and point at the bare
 * category; `?page=N` alone is indexed and points at itself; a category with fewer than 3 items is
 * not indexed (it stays followable).
 */
export function categorySeo({ slug, locale, count, params }: { slug: string; locale: Locale; count: number; params: CatalogParams }) {
  const bare = localePath(locale, categoryPath(slug));
  if (hasFilters(params)) return { canonical: bare, robots: NOINDEX };
  const canonical = params.page > 1 ? `${bare}?page=${params.page}` : bare;
  return { canonical, robots: count >= CATEGORY_INDEX_MIN_ITEMS ? INDEX : NOINDEX };
}

/** Search results are never indexed; their canonical keeps only the search text (W03 §H). */
export function searchSeo(locale: Locale, params: CatalogParams) {
  const base = localePath(locale, '/search');
  return { canonical: params.q ? `${base}?q=${encodeURIComponent(params.q)}` : base, robots: NOINDEX };
}

/** A profile under any language points at the English one; an empty profile is not indexed (W03 §G). */
export function profileSeo(id: string, listingCount: number) {
  return { canonical: profilePath(id), robots: listingCount > 0 ? INDEX : NOINDEX };
}

/** hreflang variants of a category: each language's own slug, English as x-default. */
export function categoryAlternates(slugs: LocalizedText): { hreflang: string; path: string }[] {
  return [
    ...LOCALES.map((locale) => ({ hreflang: locale, path: localePath(locale, categoryPath(slugs[locale])) })),
    { hreflang: 'x-default', path: categoryPath(slugs.en) },
  ];
}

/** The same as the HTTP `Link` header (W02 §F): `<https://…/lv/c/x>; rel="alternate"; hreflang="lv", …`. */
export function linkHeader(origin: string, alternates: { hreflang: string; path: string }[]): string {
  return alternates.map(({ hreflang, path }) => `<${origin}${path}>; rel="alternate"; hreflang="${hreflang}"`).join(', ');
}

/** Metadata fields for a canonical and robots pair (titles are the page's own). */
export function seoMetadata({ canonical, robots }: { canonical: string; robots: Robots }): Metadata {
  return { alternates: { canonical }, robots };
}

/** What kind of page a path is, for the proxy (paths as the visitor typed them, before next-intl). */
export type PageKind =
  | { kind: 'listing'; locale: Locale; id: string; slug: string }
  | { kind: 'profile'; locale: Locale }
  | { kind: 'category'; locale: Locale; slug: string }
  | { kind: 'other' };

/** A listing id (cuid): letters and digits only. */
const ID = /^[a-z0-9]{8,40}$/;

export function classifyPath(pathname: string): PageKind {
  const parts = pathname.split('/').filter(Boolean);
  let locale: Locale = 'en';
  if (parts[0] === 'lv' || parts[0] === 'ru') locale = parts.shift() as Locale;
  if (parts[0] === 'listings' && parts.length === 2 && parts[1] !== 'new') {
    const param = decodeURIComponent(parts[1]!);
    const at = param.indexOf('-');
    const id = at === -1 ? param : param.slice(0, at);
    if (ID.test(id)) return { kind: 'listing', locale, id, slug: at === -1 ? '' : param.slice(at + 1) };
  }
  if (parts[0] === 'u' && parts.length === 2) return { kind: 'profile', locale };
  if (parts[0] === 'c' && parts.length === 2) return { kind: 'category', locale, slug: decodeURIComponent(parts[1]!) };
  return { kind: 'other' };
}
