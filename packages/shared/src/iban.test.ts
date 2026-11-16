import { describe, expect, it } from 'vitest';
import { IbanSchema, maskIban, normalizeIban } from './iban';

describe('IBAN', () => {
  it('accepts a real euro-area IBAN however it is spaced or cased', () => {
    expect(IbanSchema.parse('lv80 bank 0000 4351 9500 1')).toBe('LV80BANK0000435195001');
    expect(IbanSchema.parse('DE89370400440532013000')).toBe('DE89370400440532013000');
  });

  it('refuses a wrong check digit, a country outside the euro area, or junk', () => {
    expect(IbanSchema.safeParse('LV81BANK0000435195001').success).toBe(false);
    expect(IbanSchema.safeParse('GB29NWBK60161331926819').success).toBe(false); // valid, but not in euros
    expect(IbanSchema.safeParse('hello').success).toBe(false);
  });

  it('shows only the country and the last four', () => {
    expect(maskIban('LV80BANK0000435195001')).toBe('LV •••• 5001');
    expect(normalizeIban(' lv80 bank ')).toBe('LV80BANK');
  });
});
