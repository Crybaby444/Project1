import { describe, expect, it } from 'vitest';
import { COUNTRY_CODES, CountrySchema, countryName, isCountry, timeZoneOf } from './countries';

describe('countries', () => {
  it('is the euro area (21 countries): prices and payments in euros everywhere', () => {
    expect(COUNTRY_CODES).toHaveLength(21);
    for (const code of ['LV', 'LT', 'EE', 'DE', 'FR', 'ES', 'BG', 'HR']) expect(COUNTRY_CODES).toContain(code);
    for (const code of ['PL', 'SE', 'CZ', 'DK', 'HU', 'RO', 'GB', 'CH', 'NO', 'US']) expect(COUNTRY_CODES).not.toContain(code);
    expect(CountrySchema.safeParse('DE').success).toBe(true);
    expect(CountrySchema.safeParse('de').success).toBe(false);
  });

  it('gives each country its time zone, and Latvia for anything unknown', () => {
    expect(timeZoneOf('PT')).toBe('Europe/Lisbon');
    expect(timeZoneOf('FI')).toBe('Europe/Helsinki');
    expect(timeZoneOf(null)).toBe('Europe/Riga');
    expect(isCountry('US')).toBe(false);
  });

  it('names a country in the reader’s language', () => {
    expect(countryName('DE', 'en')).toBe('Germany');
    expect(countryName('DE', 'lv')).toBe('Vācija');
    expect(countryName('DE', 'ru')).toBe('Германия');
  });
});
