import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// Next 16 calls this file `proxy`; it resolves the locale and rewrites to /[locale]/….
export default createMiddleware(routing);

export const config = {
  // Everything except API routes, Next internals and files with an extension.
  matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)',
};
