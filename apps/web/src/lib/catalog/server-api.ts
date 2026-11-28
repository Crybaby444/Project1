import { currentCountry } from '@/lib/country/server';
import { createApiClient } from '@yoyo/api-client';
import type {
  CatalogPage,
  CatalogQuery,
  CategoryCounts,
  CategoryNode,
  ItemDetail,
  ForYouResponse,
  PeopleResponse,
  PlacesResponse,
  PublicProfile,
  SitemapResponse,
} from '@yoyo/shared';
import { cache } from 'react';
import { resolveApiUrl } from '@/lib/api-url';
import { toApiSearch } from './params';
import { isCurrentTree } from './tree-shape';

/** An answer of the API on the server: the data, or the status it failed with (0: no answer in time). */
export type Loaded<T> = { ok: true; data: T } | { ok: false; status: number };

const TIMEOUT_MS = 10_000;

/** Seconds the category tree (reference data) is kept by Next's fetch cache. */
const CATEGORIES_REVALIDATE = 300;

/**
 * Seconds a page of the catalog, an item and a public profile are kept by Next's fetch cache (owner,
 * 2026-11-28: the site must carry 1000+ active people): a popular page is asked from the API about every
 * 20 seconds, not on every visit. A booking still checks the days on the API, so a calendar a few seconds
 * old can never double-book. `CATALOG_CACHE_SECONDS=0` keeps everything fresh (the e2e run).
 */
const PUBLIC_REVALIDATE = (() => {
  const seconds = Number(process.env.CATALOG_CACHE_SECONDS ?? 20);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : undefined;
})();

/**
 * Every page's header asks for the tree (the catalog menu), so a sleeping API must not hold pages up
 * for long: after this the menu shows only "All categories" and search (as the landing page does).
 */
const CATEGORIES_TIMEOUT_MS = 2500;

/**
 * The typed client for Server Components: straight to the API (no proxy, no cookies: only public
 * data), never cached unless said, and given up after 10 s so a sleeping API shows the error page.
 */
function client(revalidate?: number, timeoutMs = TIMEOUT_MS) {
  return createApiClient(resolveApiUrl(process.env.NEXT_PUBLIC_API_URL, process.env.NODE_ENV), {
    fetch: (request: Request) =>
      fetch(request, {
        signal: AbortSignal.timeout(timeoutMs),
        ...(revalidate === undefined ? { cache: 'no-store' } : { next: { revalidate } }),
      }),
  });
}

async function load<T>(call: () => Promise<{ data?: T; response: Response }>): Promise<Loaded<T>> {
  try {
    const { data, response } = await call();
    return response.ok && data !== undefined ? { ok: true, data } : { ok: false, status: response.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

/** One request per server render, shared by the layout (menu) and the page. */
export const loadCategories = cache(async (): Promise<Loaded<CategoryNode[]>> => {
  const loaded = await load(() => client(CATEGORIES_REVALIDATE, CATEGORIES_TIMEOUT_MS).GET('/api/v1/categories'));
  if (!loaded.ok) return loaded;
  // An API one release behind (Render deploys after Vercel) counts as no answer: no menu, no crash.
  return isCurrentTree(loaded.data.categories) ? { ok: true, data: loaded.data.categories } : { ok: false, status: 502 };
});

/**
 * Visible items per category and the newest covers of each top category (the catalog index, the home's
 * shelf); a minute old at most. An API without it: no counts, no covers.
 */
export const loadCategoryOverview = cache(async (): Promise<CategoryCounts | undefined> => {
  const loaded = await load(() => client(60).GET('/api/v1/catalog/category-counts'));
  return loaded.ok ? loaded.data : undefined;
});

export const loadItem = cache(async (id: string): Promise<Loaded<ItemDetail>> => {
  const loaded = await load(() => client(PUBLIC_REVALIDATE).GET('/api/v1/catalog/listings/{id}', { params: { path: { id } } }));
  return loaded.ok ? { ok: true, data: loaded.data.item } : loaded;
});

// React's cache compares arguments by identity, so the queries go in as their JSON.
const searchByKey = cache(
  async (key: string): Promise<Loaded<CatalogPage>> =>
    load(() => client(PUBLIC_REVALIDATE).GET('/api/v1/catalog/listings', { params: { query: toApiSearch(JSON.parse(key) as CatalogQuery) as never } })),
);

/** The query in the visitor's country, unless it names one (owner, 2026-11-16: one country at a time). */
const inCountry = async (query: CatalogQuery): Promise<CatalogQuery> => (query.country ? query : { ...query, country: await currentCountry() });

/** One page of the catalog, in the visitor's country; the same query twice in one render is asked once. */
export const loadSearch = async (query: CatalogQuery) => searchByKey(JSON.stringify(await inCountry(query)));

const placesIn = cache(
  async (country: string): Promise<Loaded<PlacesResponse>> =>
    load(() => client(300).GET('/api/v1/catalog/places', { params: { query: { country } as never } })),
);

const forYouIn = cache(
  async (country: string): Promise<Loaded<ForYouResponse>> =>
    load(() => client(120).GET('/api/v1/catalog/for-you', { params: { query: { country } as never } })),
);

/** The home's list before the browser knows anyone: popular now in the visitor's country (kept 2 minutes). */
export const loadForYou = async (): Promise<Loaded<ForYouResponse>> => forYouIn(await currentCountry());

/** The countries with items, and the cities and districts of the visitor's country (kept 5 minutes). */
export const loadPlaces = async (): Promise<Loaded<PlacesResponse>> => placesIn(await currentCountry());

export const loadProfile = cache(
  async (id: string): Promise<Loaded<PublicProfile>> => load(() => client(PUBLIC_REVALIDATE).GET('/api/v1/users/{id}', { params: { path: { id } } })),
);

/** People whose name or @username matches the words (the search page shows them above the items); a minute old. */
export const loadPeople = cache(
  async (q: string): Promise<Loaded<PeopleResponse>> => load(() => client(60).GET('/api/v1/people', { params: { query: { q } } })),
);

export const loadSitemap = cache(async (): Promise<Loaded<SitemapResponse>> => load(() => client().GET('/api/v1/catalog/sitemap')));
