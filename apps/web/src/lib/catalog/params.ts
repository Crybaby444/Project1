import { CATALOG_LIMITS, dayIndex, type CatalogQuery } from '@yoyo/shared';

/** Sorts people can pick (W03 §H). `relevance` is what a search gets when none is picked. */
export const SORTS = ['new', 'price_asc', 'price_desc'] as const;
export type Sort = (typeof SORTS)[number];

/**
 * What a catalog address says, after W03 §H: only these parameters exist; anything else (utm_*, gclid,
 * an old or broken one) is not read. Prices are whole euros in the address, cents in the API.
 */
export type CatalogParams = {
  q?: string;
  page: number;
  priceMin?: number;
  priceMax?: number;
  from?: string;
  to?: string;
  district?: string;
  sort?: Sort;
  view: 'list' | 'map';
};

/** The order parameters are written in, so one selection has exactly one address. */
const ORDER = ['q', 'price_min', 'price_max', 'from', 'to', 'district', 'sort', 'view', 'page'] as const;

type Raw = Record<string, string | string[] | undefined> | URLSearchParams;

function read(raw: Raw, name: string): string | undefined {
  if (raw instanceof URLSearchParams) return raw.get(name) ?? undefined;
  const value = raw[name];
  return Array.isArray(value) ? value[0] : value;
}

function wholeNumber(text: string | undefined, max: number): number | undefined {
  if (text === undefined || !/^\d{1,9}$/.test(text)) return undefined;
  const value = Number(text);
  return value <= max ? value : undefined;
}

/** Highest price a filter can name, in euros (the domain allows 10 000 € a day). */
const MAX_EUROS = 10_000;

/** Reads an address; a broken parameter is dropped on its own, so an old link never fails. */
export function parseCatalogParams(raw: Raw): CatalogParams {
  const params: CatalogParams = { page: wholeNumber(read(raw, 'page'), CATALOG_LIMITS.page) || 1, view: 'list' };
  const q = read(raw, 'q')?.trim().replace(/\s+/g, ' ');
  if (q) params.q = q.slice(0, CATALOG_LIMITS.q);
  const priceMin = wholeNumber(read(raw, 'price_min'), MAX_EUROS);
  const priceMax = wholeNumber(read(raw, 'price_max'), MAX_EUROS);
  if (priceMin !== undefined) params.priceMin = priceMin;
  if (priceMax !== undefined && (priceMin === undefined || priceMax >= priceMin)) params.priceMax = priceMax;
  const from = read(raw, 'from');
  const to = read(raw, 'to');
  if (from && to) {
    const start = dayIndex(from);
    const end = dayIndex(to);
    if (start !== null && end !== null && end >= start && end - start < CATALOG_LIMITS.periodDays) {
      params.from = from;
      params.to = to;
    }
  }
  const district = read(raw, 'district');
  if (district && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(district) && district.length <= CATALOG_LIMITS.place) params.district = district;
  const sort = read(raw, 'sort');
  if ((SORTS as readonly string[]).includes(sort ?? '')) params.sort = sort as Sort;
  if (read(raw, 'view') === 'map') params.view = 'map';
  return params;
}

/** The query string (with `?`, or empty) of `params` changed by `patch`; any change but the page resets it. */
export function catalogSearch(params: CatalogParams, patch: Partial<CatalogParams> = {}): string {
  const next: CatalogParams = { ...params, ...patch };
  const changesFilters = Object.keys(patch).some((key) => key !== 'page');
  if (changesFilters && patch.page === undefined) next.page = 1;
  const values: Record<(typeof ORDER)[number], string | undefined> = {
    q: next.q || undefined,
    price_min: next.priceMin?.toString(),
    price_max: next.priceMax?.toString(),
    from: next.from && next.to ? next.from : undefined,
    to: next.from && next.to ? next.to : undefined,
    district: next.district,
    sort: next.sort,
    view: next.view === 'map' ? 'map' : undefined,
    page: next.page > 1 ? String(next.page) : undefined,
  };
  const search = new URLSearchParams();
  for (const name of ORDER) {
    const value = values[name];
    if (value !== undefined) search.set(name, value);
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

/** Anything that narrows or reorders the results (the page alone does not count). */
export function hasFilters(params: CatalogParams): boolean {
  return (
    params.q !== undefined ||
    params.priceMin !== undefined ||
    params.priceMax !== undefined ||
    params.from !== undefined ||
    params.district !== undefined ||
    params.sort !== undefined ||
    params.view === 'map'
  );
}

/** How many filters are on (for the "Filters (N)" button): price and dates count once each. */
export function filterCount(params: CatalogParams): number {
  return [
    params.priceMin !== undefined || params.priceMax !== undefined,
    params.from !== undefined,
    params.district !== undefined,
  ].filter(Boolean).length;
}

/** The API's query for an address (and the category of the page, by its stable key). */
export function toApiQuery(params: CatalogParams, category?: string): CatalogQuery {
  return {
    page: params.page,
    ...(params.q !== undefined && { q: params.q }),
    ...(category !== undefined && { category }),
    ...(params.priceMin !== undefined && { priceMin: params.priceMin * 100 }),
    ...(params.priceMax !== undefined && { priceMax: params.priceMax * 100 }),
    ...(params.from !== undefined && params.to !== undefined && { start: params.from, end: params.to }),
    ...(params.district !== undefined && { district: params.district }),
    ...(params.sort !== undefined && { sort: params.sort }),
  };
}

/** The same query as the API reads it from a query string. */
export function toApiSearch(query: CatalogQuery): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;
    out[key] = Array.isArray(value) ? value.join(',') : String(value);
  }
  return out;
}
