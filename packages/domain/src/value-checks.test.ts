import { describe, expect, it } from 'vitest';
import { HIGH_VALUE, isHighValue, missingForDeal } from './value-checks';

describe('checks that grow with the deal’s value (audit D4, like Fat Llama)', () => {
  it('a deal is high-value from a €300 deposit or €500 rent', () => {
    expect(HIGH_VALUE).toEqual({ depositCents: 30_000, rentCents: 50_000 });
    expect(isHighValue({ depositCents: 29_999, rentCents: 49_999 })).toBe(false);
    expect(isHighValue({ depositCents: 30_000, rentCents: 0 })).toBe(true);
    expect(isHighValue({ depositCents: 0, rentCents: 50_000 })).toBe(true);
  });

  it('an ordinary deal asks for nothing more', () => {
    expect(missingForDeal({ depositCents: 5_000, rentCents: 4_500 }, { phoneVerified: false, identityVerified: false })).toEqual([]);
  });

  it('a high-value deal needs a confirmed phone and identity, and names what is missing', () => {
    const deal = { depositCents: 80_000, rentCents: 12_000 };
    expect(missingForDeal(deal, { phoneVerified: false, identityVerified: false })).toEqual(['PHONE', 'IDENTITY']);
    expect(missingForDeal(deal, { phoneVerified: true, identityVerified: false })).toEqual(['IDENTITY']);
    expect(missingForDeal(deal, { phoneVerified: true, identityVerified: true })).toEqual([]);
  });
});
