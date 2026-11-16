import { z } from 'zod';

/**
 * The countries Yoyo works in (owner, 2026-11-16): the euro area, so every price and payment is in euros.
 * ISO 3166-1 alpha-2, with the time zone a deal's days are counted in. (EU members with their own
 * currency, and the rest of Europe, wait for local currencies.)
 */
export const COUNTRIES = {
  AT: 'Europe/Vienna', BE: 'Europe/Brussels', BG: 'Europe/Sofia', HR: 'Europe/Zagreb', CY: 'Asia/Nicosia',
  EE: 'Europe/Tallinn', FI: 'Europe/Helsinki', FR: 'Europe/Paris', DE: 'Europe/Berlin', GR: 'Europe/Athens',
  IE: 'Europe/Dublin', IT: 'Europe/Rome', LV: 'Europe/Riga', LT: 'Europe/Vilnius', LU: 'Europe/Luxembourg',
  MT: 'Europe/Malta', NL: 'Europe/Amsterdam', PT: 'Europe/Lisbon', SK: 'Europe/Bratislava', SI: 'Europe/Ljubljana',
  ES: 'Europe/Madrid',
} as const;

export type Country = keyof typeof COUNTRIES;
export const COUNTRY_CODES = Object.keys(COUNTRIES) as Country[];
export const CountrySchema = z.enum(COUNTRY_CODES as [Country, ...Country[]]);

/** Where Yoyo started: the country a listing without one is taken to be in. */
export const HOME_COUNTRY: Country = 'LV';

export function isCountry(code: string | null | undefined): code is Country {
  return !!code && Object.prototype.hasOwnProperty.call(COUNTRIES, code);
}

/** The time zone of a country's deals (Spain's Canary Islands and Portugal's Azores use the mainland's). */
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
