/** Interface languages of Yoyo. English is the main language. */
export const LOCALES = ['en', 'lv', 'ru'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

/** True only for an exact, lowercase supported locale code. */
export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}
