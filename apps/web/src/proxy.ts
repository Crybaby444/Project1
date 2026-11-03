import { DEFAULT_LOCALE, isLocale } from '@yoyo/shared';
import createMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const intl = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const first = pathname.split('/')[1] ?? '';
  // Locale prefixes are exact: /LV is not /lv. Serve it as an unknown page so it gets the styled 404
  // instead of next-intl's case-insensitive redirect.
  if (first !== first.toLowerCase() && isLocale(first.toLowerCase())) {
    const url = request.nextUrl.clone();
    url.pathname = `/${DEFAULT_LOCALE}${pathname}`;
    return NextResponse.rewrite(url);
  }
  return intl(request);
}

export const config = {
  // Everything except API routes, Next internals and files with an extension.
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
};
