import createMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';
import { apiRequestHeaders, apiTarget, isApiPath } from './lib/api-proxy';
import { resolveApiUrl } from './lib/api-url';

const intl = createMiddleware(routing);
const apiOrigin = resolveApiUrl(process.env.NEXT_PUBLIC_API_URL, process.env.NODE_ENV);

/**
 * Next 16 calls this file `proxy`.
 * - `/api/*` goes to the same path on the API, so the session cookies stay first-party on the site's
 *   own domain. The server-only PROXY_SECRET travels along in `x-yoyo-proxy-secret`, which is how the
 *   API knows it may trust the visitor address in X-Forwarded-For. (next.config rewrites cannot add
 *   request headers, hence this file.)
 * - Everything else: next-intl resolves the locale and rewrites to /[locale]/….
 */
export default function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  if (isApiPath(pathname)) {
    return NextResponse.rewrite(apiTarget(pathname, search, apiOrigin), {
      request: { headers: apiRequestHeaders(request.headers, process.env.PROXY_SECRET) },
    });
  }
  return intl(request);
}

export const config = {
  // The API proxy, and every page path except Next internals and files with an extension.
  matcher: ['/api/:path*', '/((?!api|trpc|_next|_vercel|.*\\..*).*)'],
};
