import type { CategoryNode, ItemAddress } from '@yoyo/shared';
import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';
import { apiRequestHeaders, apiTarget, isApiPath } from './lib/api-proxy';
import { resolveApiUrl } from './lib/api-url';
import { CONTENT_LOCALE_HEADER, decidePage, type Lookups } from './lib/page-headers';
import { siteOrigin } from './lib/seo';

const intl = createMiddleware(routing);
const apiOrigin = resolveApiUrl(process.env.NEXT_PUBLIC_API_URL, process.env.NODE_ENV);

/** The proxy asks the API before item and category pages; it never waits long for it. */
const LOOKUP_TIMEOUT_MS = 3_000;
const CATEGORIES_TTL_MS = 5 * 60_000;

let categoriesCache: { at: number; tree: CategoryNode[] } | null = null;

const lookups: Lookups = {
  async address(id) {
    try {
      const res = await fetch(`${apiOrigin}/api/v1/catalog/listings/${encodeURIComponent(id)}/address`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
      });
      return res.ok ? { status: 200, data: (await res.json()) as ItemAddress } : { status: res.status };
    } catch {
      return { status: 0 };
    }
  },
  async categories() {
    if (categoriesCache && Date.now() - categoriesCache.at < CATEGORIES_TTL_MS) return categoriesCache.tree;
    try {
      const res = await fetch(`${apiOrigin}/api/v1/categories`, { signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS) });
      if (!res.ok) return categoriesCache?.tree ?? null;
      const tree = ((await res.json()) as { categories: CategoryNode[] }).categories;
      categoriesCache = { at: Date.now(), tree };
      return tree;
    } catch {
      return categoriesCache?.tree ?? null;
    }
  },
};

/**
 * Next 16 calls this file `proxy`.
 * - `/api/*` goes to the same path on the API, so the session cookies stay first-party on the site's
 *   own domain. The server-only PROXY_SECRET travels along in `x-yoyo-proxy-secret`, which is how the
 *   API knows it may trust the visitor address in X-Forwarded-For. (next.config rewrites cannot add
 *   request headers, hence this file.)
 * - Item, profile and category pages follow the SEO rules first (lib/page-headers.ts): 301 to the right
 *   address, 410 for a removed item, and the hreflang `Link` header only where it is right.
 * - Everything else: next-intl resolves the locale and rewrites to /[locale]/….
 */
export default async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname, search } = request.nextUrl;
  if (isApiPath(pathname)) {
    return NextResponse.rewrite(apiTarget(pathname, search, apiOrigin), {
      request: { headers: apiRequestHeaders(request.headers, process.env.PROXY_SECRET) },
    });
  }

  // Alternates name the live site, like canonical and the sitemaps (previews point there too, site.ts).
  const origin = siteOrigin();
  const decision = await decidePage(pathname, search, origin, lookups);
  if (decision.action === 'redirect') return NextResponse.redirect(new URL(decision.location, request.url), 301);
  if (decision.action === 'gone') {
    return NextResponse.rewrite(new URL(`/${decision.locale}/listing-gone`, request.url), { status: 410 });
  }

  // Only this proxy sets the content-language header; a copy sent from outside never reaches a page.
  const headers = new Headers(request.headers);
  headers.delete(CONTENT_LOCALE_HEADER);
  if (decision.contentLocale) headers.set(CONTENT_LOCALE_HEADER, decision.contentLocale);
  const response = intl(new NextRequest(request, { headers }));
  if (decision.link === 'drop') response.headers.delete('Link');
  else if (decision.link !== 'keep') response.headers.set('Link', decision.link);
  return response;
}

export const config = {
  // The API proxy, and every page path except Next internals and files with an extension.
  matcher: ['/api/:path*', '/((?!api|trpc|_next|_vercel|.*\\..*).*)'],
};
