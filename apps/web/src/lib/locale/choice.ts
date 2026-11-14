import { isLocale, LOCALES, type Locale } from '@yoyo/shared';

/**
 * The visitor's language choice. Every URL serves its own language (no redirect on
 * Accept-Language or on this cookie: routing.ts, `localeDetection: false`), so the cookie only
 * remembers that a choice was made: by the header or footer language switcher, or by answering the
 * language suggestion (LanguageSuggestion). The API reads it too, to send a failed Google sign-in
 * back to the right language.
 */
export const LOCALE_COOKIE = 'NEXT_LOCALE';

/** A choice is kept for a year (the cookie policy says so). */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** The language this browser chose before, if any. */
export function readLocaleChoice(cookie: string = document.cookie): Locale | null {
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=([^;]*)`));
  const value = match?.[1] ? decodeURIComponent(match[1]) : null;
  return value && isLocale(value) ? value : null;
}

export function writeLocaleChoice(locale: Locale): void {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
}

/**
 * The language to suggest on this page, from the browser's preferred languages (navigator.languages,
 * most preferred first): the first one the site has, if that is not the page's own. "lv-LV" counts
 * as "lv". Null when the page is already in it, or the browser prefers no language the site has.
 */
export function suggestLocale(browserLanguages: readonly string[], pageLocale: Locale): Locale | null {
  for (const tag of browserLanguages) {
    const primary = tag.toLowerCase().split('-')[0] ?? '';
    if ((LOCALES as readonly string[]).includes(primary)) {
      return primary === pageLocale ? null : (primary as Locale);
    }
  }
  return null;
}
