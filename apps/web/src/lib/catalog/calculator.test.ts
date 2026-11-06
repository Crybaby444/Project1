import type { AvailableItem } from '@yoyo/shared';
import { describe, expect, it } from 'vitest';
import { priceFor } from './calculator';

const item = (overrides: Partial<AvailableItem['listing']> = {}): Pick<AvailableItem, 'listing' | 'blocked' | 'booking'> => ({
  listing: { dailyCents: 1500, weeklyDiscountPercent: 10, depositCents: 5000, minDays: 1, maxDays: 14, ...overrides } as AvailableItem['listing'],
  blocked: [{ start: '2026-12-10', end: '2026-12-12' }],
  booking: { servicePercent: 10, maxAdvanceDays: 365, today: '2026-12-01' },
});

describe('priceFor', () => {
  it('prices 7 days with the weekly discount and the fee exactly like the API (Review Focus 4)', () => {
    const result = priceFor(item(), '2026-12-02', '2026-12-08');
    expect(result).toEqual({
      ok: true,
      days: 7,
      quote: expect.objectContaining({ baseCents: 10500, discountPercent: 10, discountCents: 1050, rentCents: 9450, serviceFeeCents: 945, depositCents: 5000, totalCents: 15395 }),
    });
  });

  it('gives no discount under 7 days', () => {
    const result = priceFor(item(), '2026-12-02', '2026-12-03');
    expect(result.ok && result.quote.discountCents).toBe(0);
  });

  it('names what is wrong with the days', () => {
    expect(priceFor(item({ minDays: 3 }), '2026-12-02', '2026-12-03')).toMatchObject({ ok: false, problem: 'PERIOD_TOO_SHORT', days: 2 });
    expect(priceFor(item({ maxDays: 2 }), '2026-12-02', '2026-12-04')).toMatchObject({ ok: false, problem: 'PERIOD_TOO_LONG' });
    expect(priceFor(item(), '2026-12-09', '2026-12-13')).toMatchObject({ ok: false, problem: 'DATES_UNAVAILABLE' });
    expect(priceFor(item(), '2026-11-30', '2026-12-02')).toMatchObject({ ok: false, problem: 'START_IN_PAST' });
    expect(priceFor(item(), '2028-01-01', '2028-01-02')).toMatchObject({ ok: false, problem: 'TOO_FAR_AHEAD' });
    expect(priceFor(item(), '2026-12-05', '2026-12-04')).toMatchObject({ ok: false, problem: 'INVALID_PERIOD' });
  });
});
