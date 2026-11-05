import { CategoriesResponseSchema, type CategoryNode } from '@yoyo/shared';
import { resolveApiUrl } from './api-url';

export type CategoriesResult = { ok: true; categories: CategoryNode[] } | { ok: false };

type LoadOptions = {
  fetchImpl?: (url: string, init?: RequestInit & { next?: { revalidate?: number } }) => Promise<Response>;
  apiOrigin?: string;
  /** The free API host may be asleep for up to a minute; the page never waits that long. */
  timeoutMs?: number;
};

/** How long Next keeps the answer (the API itself allows 5 minutes of caching). */
const REVALIDATE_S = 300;

/**
 * The category tree for the landing page, fetched by the server from the API. Never throws: a slow,
 * failing or odd answer is `{ ok: false }`, and the page offers to try again from the browser.
 */
export async function loadCategories({
  fetchImpl = fetch,
  apiOrigin = resolveApiUrl(process.env.NEXT_PUBLIC_API_URL, process.env.NODE_ENV),
  timeoutMs = 2500,
}: LoadOptions = {}): Promise<CategoriesResult> {
  try {
    const response = await fetchImpl(`${apiOrigin}/api/v1/categories`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
      next: { revalidate: REVALIDATE_S },
    });
    if (!response.ok) return { ok: false };
    const parsed = CategoriesResponseSchema.safeParse(await response.json());
    return parsed.success ? { ok: true, categories: parsed.data.categories } : { ok: false };
  } catch {
    return { ok: false };
  }
}
