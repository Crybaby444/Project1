import { describe, expect, it } from 'vitest';
import { countryCookie, pickCountry } from './country';

describe('pickCountry', () => {
  it('takes the visitor’s choice first, then where they connect from, then Latvia', () => {
    expect(pickCountry('LT', 'EE')).toBe('LT');
    expect(pickCountry(null, 'ee')).toBe('EE');
    expect(pickCountry('DE', 'FR')).toBe('LV'); // an old choice and a visitor outside the Baltics (2026-11-19)
    expect(pickCountry('XX', 'PL')).toBe('LV');
    expect(pickCountry(undefined, undefined)).toBe('LV');
  });

  it('saves the choice for a year on the whole site', () => {
    expect(countryCookie('EE')).toBe('yoyo-country=EE; Path=/; Max-Age=31536000; SameSite=Lax');
  });
});
