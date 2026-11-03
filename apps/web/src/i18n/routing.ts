import { DEFAULT_LOCALE, LOCALES } from '@yoyo/shared';
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'as-needed',
  // The language is chosen by URL only; no redirects based on Accept-Language.
  localeDetection: false,
  localeCookie: false,
});
