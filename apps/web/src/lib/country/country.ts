import { HOME_COUNTRY, isCountry, type Country } from '@yoyo/shared';

/** The cookie that remembers the visitor's country (a year, the whole site). */
export const COUNTRY_COOKIE = 'yoyo-country';

/**
 * The country the catalog shows (owner, 2026-11-16: one country at a time): the one the visitor chose,
 * else the one their connection is in when Yoyo works there, else Latvia, where Yoyo started.
 */
export function pickCountry(chosen: string | null | undefined, fromIp: string | null | undefined): Country {
  if (isCountry(chosen)) return chosen;
  if (isCountry(fromIp?.toUpperCase())) return fromIp!.toUpperCase() as Country;
  return HOME_COUNTRY;
}

/** The cookie line that saves a choice in the browser. */
export function countryCookie(country: Country): string {
  return `${COUNTRY_COOKIE}=${country}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

/** Keeps the choice in this browser (the server reads the same cookie). */
export function saveCountry(country: Country): void {
  document.cookie = countryCookie(country);
}
