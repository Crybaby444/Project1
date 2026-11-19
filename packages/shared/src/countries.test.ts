import { describe, expect, it } from 'vitest';
import { COUNTRY_CODES, CountrySchema, countryName, isCountry, timeZoneOf } from './countries';

describe('countries', () => {
  it('is the Baltic states (owner, 2026-11-19), all in euros', () => {
    expect(COUNTRY_CODES).toEqual(['LV', 'LT', 'EE']);
    for (const code of ['DE', 'FR', 'FI', 'PL', 'SE', 'US']) expect(CountrySchema.safeParse(code).success).toBe(false);
    expect(CountrySchema.safeParse('LT').success).toBe(true);
    expect(CountrySchema.safeParse('lt').success).toBe(false);
  });

  it('gives each country its time zone, and Latvia for anything unknown', () => {
    expect(timeZoneOf('LT')).toBe('Europe/Vilnius');
    expect(timeZoneOf('EE')).toBe('Europe/Tallinn');
    expect(timeZoneOf('DE')).toBe('Europe/Riga');
    expect(timeZoneOf(null)).toBe('Europe/Riga');
    expect(isCountry('US')).toBe(false);
  });

  it('names a country in the reader’s language', () => {
    expect(countryName('LT', 'en')).toBe('Lithuania');
    expect(countryName('LT', 'lv')).toBe('Lietuva');
    expect(countryName('EE', 'ru')).toBe('Эстония');
  });
});
