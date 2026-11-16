import { describe, expect, it } from 'vitest';
import { countryCookie, pickCountry } from './country';

describe('pickCountry', () => {
  it('takes the visitor’s choice first, then where they connect from, then Latvia', () => {
    expect(pickCountry('DE', 'FR')).toBe('DE');
    expect(pickCountry(null, 'fr')).toBe('FR');
    expect(pickCountry('XX', 'PL')).toBe('LV'); // a broken cookie, and Poland is not in the euro area
    expect(pickCountry(undefined, undefined)).toBe('LV');
  });

  it('saves the choice for a year on the whole site', () => {
    expect(countryCookie('EE')).toBe('yoyo-country=EE; Path=/; Max-Age=31536000; SameSite=Lax');
  });
});
