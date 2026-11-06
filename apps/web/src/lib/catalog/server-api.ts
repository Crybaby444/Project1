import { createApiClient } from '@yoyo/api-client';
import type {
  CatalogPage,
  CatalogQuery,
  CategoryNode,
  ItemDetail,
  MapResponse,
  PlacesResponse,
  PublicProfile,
  SitemapResponse,
} from '@yoyo/shared';
import { cache } from 'react';
import { resolveApiUrl } from '@/lib/api-url';
import { toApiSearch } from './params';

/** An answer of the API on the server: the data, or the status it failed with (0: no answer in time). */
export type Loaded<T> = { ok: true; data: T } | { ok: false; status: number };

const TIMEOUT_MS = 10_000;

/** Seconds the category tree (reference data) is kept by Next's fetch cache. */
const CATEGORIES_REVALIDATE = 300;

/**
 * The typed client for Server Components: straight to the API (no proxy, no cookies: only public
 * data), never cached unless said, and given up after 10 s so a sleeping API shows the error page.
 */
function client(revalidate?: number) {
  return createApiClient(resolveApiUrl(process.env.NEXT_PUBLIC_API_URL, process.env.NODE_ENV), {
    fetch: (request: Request) =>
      fetch(request, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
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
  const loaded = await load(() => client(CATEGORIES_REVALIDATE).GET('/api/v1/categories'));
  return loaded.ok ? { ok: true, data: loaded.data.categories } : loaded;
});

export const loadItem = cache(async (id: string): Promise<Loaded<ItemDetail>> => {
  const loaded = await load(() => client().GET('/api/v1/catalog/listings/{id}', { params: { path: { id } } }));
  return loaded.ok ? { ok: true, data: loaded.data.item } : loaded;
});

// React's cache compares arguments by identity, so the queries go in as their JSON.
const searchByKey = cache(
  async (key: string): Promise<Loaded<CatalogPage>> =>
    load(() => client().GET('/api/v1/catalog/listings', { params: { query: toApiSearch(JSON.parse(key) as CatalogQuery) as never } })),
);

const mapByKey = cache(
  async (key: string): Promise<Loaded<MapResponse>> =>
    load(() => client().GET('/api/v1/catalog/map', { params: { query: toApiSearch(JSON.parse(key) as CatalogQuery) as never } })),
);

/** One page of the catalog; the same query twice in one render is asked once. */
export const loadSearch = (query: CatalogQuery) => searchByKey(JSON.stringify(query));

export const loadMap = (query: CatalogQuery) => mapByKey(JSON.stringify(query));

export const loadPlaces = cache(async (): Promise<Loaded<PlacesResponse>> => load(() => client().GET('/api/v1/catalog/places')));

export const loadProfile = cache(
  async (id: string): Promise<Loaded<PublicProfile>> => load(() => client().GET('/api/v1/users/{id}', { params: { path: { id } } })),
);

export const loadSitemap = cache(async (): Promise<Loaded<SitemapResponse>> => load(() => client().GET('/api/v1/catalog/sitemap')));
