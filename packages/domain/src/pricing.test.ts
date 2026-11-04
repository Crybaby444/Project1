import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { cents } from './money';
import { PRICING_LIMITS, WEEKLY_DISCOUNT_FROM_DAYS, quote, validateOffer, validatePricing } from './pricing';
import type { ListingPricing } from './pricing';

const code = (expected: string) => expect.objectContaining({ code: expected });

const p: ListingPricing = {
  dailyCents: cents(1500),
  weeklyDiscountPercent: 20,
  depositCents: cents(10000),
  minDays: 1,
  maxDays: 30,
};

describe('validatePricing', () => {
  it('accepts prices on the limits themselves', () => {
    expect(() =>
      validatePricing({
        dailyCents: cents(100),
        weeklyDiscountPercent: 0,
        depositCents: cents(0),
        minDays: 1,
        maxDays: 1,
      }),
    ).not.toThrow();
    expect(() =>
      validatePricing({
        dailyCents: cents(1_000_000),
        weeklyDiscountPercent: 90,
        depositCents: cents(5_000_000),
        minDays: 365,
        maxDays: 365,
      }),
    ).not.toThrow();
  });

  it('publishes its limits for forms', () => {
    expect(PRICING_LIMITS).toEqual({
      dailyCents: { min: 100, max: 1_000_000 },
      weeklyDiscountPercent: { min: 0, max: 90 },
      depositCents: { min: 0, max: 5_000_000 },
      days: { min: 1, max: 365 },
    });
  });

  it.each([
    ['dailyCents', { dailyCents: 99 }],
    ['dailyCents', { dailyCents: 1_000_001 }],
    ['dailyCents', { dailyCents: 150.5 }],
    ['weeklyDiscountPercent', { weeklyDiscountPercent: -1 }],
    ['weeklyDiscountPercent', { weeklyDiscountPercent: 91 }],
    ['weeklyDiscountPercent', { weeklyDiscountPercent: 12.5 }],
    ['depositCents', { depositCents: -1 }],
    ['depositCents', { depositCents: 5_000_001 }],
    ['minDays', { minDays: 0 }],
    ['minDays', { minDays: 1.5 }],
    ['minDays', { minDays: 366, maxDays: 366 }],
    ['maxDays', { minDays: 10, maxDays: 9 }],
    ['maxDays', { maxDays: 366 }],
  ])('names the field it refuses: %s in %j', (field, change) => {
    expect(() => validatePricing({ ...p, ...change } as ListingPricing)).toThrow(
      expect.objectContaining({ code: 'INVALID_PRICING', details: expect.objectContaining({ field }) }),
    );
  });
});

describe('quote (Review Focus 5)', () => {
  it('prices a short rental with no discount', () => {
    expect(quote({ pricing: p, days: 3, servicePercent: 10 })).toEqual({
      days: 3,
      dailyCents: 1500,
      baseCents: 4500,
      discountPercent: 0,
      discountCents: 0,
      rentCents: 4500,
      serviceFeeCents: 450,
      depositCents: 10000,
      totalCents: 14950,
      ownerPayoutCents: 4500,
    });
  });

  it('applies the weekly discount from seven days on', () => {
    expect(WEEKLY_DISCOUNT_FROM_DAYS).toBe(7);
    expect(quote({ pricing: p, days: 6, servicePercent: 10 })).toMatchObject({
      discountPercent: 0,
      discountCents: 0,
    });
    expect(quote({ pricing: p, days: 7, servicePercent: 10 })).toMatchObject({
      baseCents: 10500,
      discountPercent: 20,
      discountCents: 2100,
      rentCents: 8400,
      serviceFeeCents: 840,
      totalCents: 19240,
      ownerPayoutCents: 8400,
    });
  });

  it('does not stack the weekly discount on an agreed price', () => {
    expect(quote({ pricing: p, days: 7, servicePercent: 10, agreedDailyCents: cents(1200) })).toMatchObject({
      dailyCents: 1200,
      baseCents: 8400,
      discountPercent: 0,
      discountCents: 0,
      rentCents: 8400,
    });
  });

  it('rounds the fee to the cent, half up', () => {
    const pricing = { ...p, dailyCents: cents(1234), weeklyDiscountPercent: 0 };
    expect(quote({ pricing, days: 1, servicePercent: 10 }).serviceFeeCents).toBe(123);
  });

  it('rounds the discount and the fee once, on the sums for the period, not per day', () => {
    // Per day: 15 % of 12.34 € is 1.85 €, × 7 = 12.95 €. On the period: 15 % of 86.38 € is 12.96 €.
    const pricing = { ...p, dailyCents: cents(1234), weeklyDiscountPercent: 15 };
    expect(quote({ pricing, days: 7, servicePercent: 10 })).toMatchObject({
      baseCents: 8638,
      discountCents: 1296,
      rentCents: 7342,
      serviceFeeCents: 734,
      totalCents: 18076,
    });
  });

  it('refuses a length the listing does not allow', () => {
    expect(() => quote({ pricing: p, days: 31, servicePercent: 10 })).toThrow(code('PERIOD_TOO_LONG'));
    expect(() => quote({ pricing: { ...p, minDays: 3 }, days: 2, servicePercent: 10 })).toThrow(
      code('PERIOD_TOO_SHORT'),
    );
    expect(() => quote({ pricing: p, days: 2.5, servicePercent: 10 })).toThrow(code('INVALID_INPUT'));
  });

  it('refuses a fee percent outside 0–100', () => {
    expect(() => quote({ pricing: p, days: 3, servicePercent: 101 })).toThrow(code('INVALID_PERCENT'));
  });

  it('keeps every part a whole, non-negative amount, and the total equal to the sum of its parts', () => {
    const scenario = fc
      .record({
        dailyCents: fc.integer({ min: 100, max: 1_000_000 }),
        weeklyDiscountPercent: fc.integer({ min: 0, max: 90 }),
        depositCents: fc.oneof(fc.constant(0), fc.integer({ min: 0, max: 5_000_000 })),
        minDays: fc.integer({ min: 1, max: 365 }),
        servicePercent: fc.integer({ min: 0, max: 100 }),
        agreed: fc.boolean(),
      })
      .chain((s) =>
        fc.record({
          s: fc.constant(s),
          maxDays: fc.integer({ min: s.minDays, max: 365 }),
          offer: fc.integer({ min: 100, max: Math.max(100, s.dailyCents - 1) }),
        }),
      )
      .chain(({ s, maxDays, offer }) =>
        fc.record({
          s: fc.constant(s),
          maxDays: fc.constant(maxDays),
          offer: fc.constant(offer),
          days: fc.integer({ min: s.minDays, max: maxDays }),
        }),
      );

    fc.assert(
      fc.property(scenario, ({ s, maxDays, offer, days }) => {
        const pricing: ListingPricing = {
          dailyCents: cents(s.dailyCents),
          weeklyDiscountPercent: s.weeklyDiscountPercent,
          depositCents: cents(s.depositCents),
          minDays: s.minDays,
          maxDays,
        };
        const q = quote({
          pricing,
          days,
          servicePercent: s.servicePercent,
          ...(s.agreed ? { agreedDailyCents: cents(offer) } : {}),
        });

        for (const value of Object.values(q)) {
          expect(Number.isSafeInteger(value) && value >= 0).toBe(true);
        }
        expect(q.days).toBe(days);
        expect(q.baseCents).toBe(q.dailyCents * days);
        expect(q.rentCents).toBeLessThanOrEqual(q.baseCents);
        expect(q.discountCents).toBe(q.baseCents - q.rentCents);
        expect(q.serviceFeeCents).toBeLessThanOrEqual(q.rentCents);
        expect(q.totalCents).toBe(q.rentCents + q.serviceFeeCents + q.depositCents);
        expect(q.ownerPayoutCents).toBe(q.rentCents);
        expect(q.depositCents).toBe(s.depositCents);
      }),
      { numRuns: 500 },
    );
  });
});

describe('validateOffer', () => {
  it('accepts a daily price below the listed one, from 1 €', () => {
    expect(() => validateOffer(p, cents(1499))).not.toThrow();
    expect(() => validateOffer(p, cents(100))).not.toThrow();
  });

  it.each([1500, 1600, 99, 0])('refuses an offer of %s cents', (offer) => {
    expect(() => validateOffer(p, cents(offer))).toThrow(code('INVALID_OFFER'));
  });
});
