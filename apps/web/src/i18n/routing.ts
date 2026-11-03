import { DEFAULT_LOCALE, LOCALES } from '@yoyo/shared';
import { defineRouting } from 'next-intl/routing';

/** English lives at /, Latvian at /lv, Russian at /ru. */
export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'as-needed',
});
