import { DEFAULT_LOCALE, LOCALES } from '@yoyo/shared';
import { defineRouting } from 'next-intl/routing';

/**
 * English lives at /, Latvian at /lv, Russian at /ru, and every URL serves its own language: no
 * redirect from Accept-Language or from a cookie (SEO rule agreed with the owner on 2026-11-06).
 * A browser that prefers another language gets a suggestion instead (LanguageSuggestion). The
 * NEXT_LOCALE cookie is written only when the visitor picks a language (lib/locale/choice.ts), never
 * by the proxy on a plain visit, so it really means "already chose". The proxy still sends the
 * hreflang alternates as a Link header.
 */
export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'as-needed',
  localeDetection: false,
  localeCookie: false,
});
