import { z } from 'zod';

/**
 * The countries Yoyo works in: the Baltic states (owner, 2026-11-19; the whole euro area before that).
 * All three use the euro. ISO 3166-1 alpha-2, with the time zone a deal's days are counted in.
 */
export const COUNTRIES = {
  LV: 'Europe/Riga',
  LT: 'Europe/Vilnius',
  EE: 'Europe/Tallinn',
} as const;

export type Country = keyof typeof COUNTRIES;
export const COUNTRY_CODES = Object.keys(COUNTRIES) as Country[];
export const CountrySchema = z.enum(COUNTRY_CODES as [Country, ...Country[]]);

/** Where Yoyo started: the country a listing without one is taken to be in. */
export const HOME_COUNTRY: Country = 'LV';

export function isCountry(code: string | null | undefined): code is Country {
  return !!code && Object.prototype.hasOwnProperty.call(COUNTRIES, code);
}

/** The time zone of a country's deals. */
export function timeZoneOf(country: string | null | undefined): string {
  return isCountry(country) ? COUNTRIES[country] : COUNTRIES[HOME_COUNTRY];
}

/** A country's name in the reader's language, from the browser's own list (no table to keep). */
export function countryName(code: Country, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}
