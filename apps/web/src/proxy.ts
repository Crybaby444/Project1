import { DEFAULT_LOCALE, isLocale } from '@yoyo/shared';
import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './i18n/routing';

const handleI18nRouting = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  const firstSegment = request.nextUrl.pathname.split('/')[1] ?? '';

  // A locale in the wrong case (`/LV`) is not a valid address: show the 404
  // instead of letting next-intl silently redirect to `/lv`.
  if (!isLocale(firstSegment) && isLocale(firstSegment.toLowerCase())) {
    const url = request.nextUrl.clone();
    url.pathname = `/${DEFAULT_LOCALE}${request.nextUrl.pathname}`;
    return NextResponse.rewrite(url);
  }

  return handleI18nRouting(request);
}

export const config = {
  // Everything except API routes, Next internals and files with an extension.
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
};
