import { describe, expect, it } from 'vitest';
import { NOW, given, owner, step } from './booking/test-support';
import { canReview } from './reviews';
import { DEFAULT_BOOKING_SETTINGS } from './settings';

const DAY_MS = 86_400_000;
const afterCompletion = (days: number, ms = 0) => new Date(NOW.getTime() + days * DAY_MS + ms);

describe('canReview', () => {
  const completed = step(given('RETURNED'), owner, { type: 'ALL_FINE' }); // completed at NOW

  it('is open for 14 days after the deal completed, and not a millisecond longer', () => {
    expect(canReview(completed, NOW, DEFAULT_BOOKING_SETTINGS)).toBe(true);
    expect(canReview(completed, afterCompletion(14), DEFAULT_BOOKING_SETTINGS)).toBe(true);
    expect(canReview(completed, afterCompletion(14, 1), DEFAULT_BOOKING_SETTINGS)).toBe(false);
  });

  it('follows the window in the settings', () => {
    const settings = { ...DEFAULT_BOOKING_SETTINGS, reviewWindowDays: 7 };
    expect(canReview(completed, afterCompletion(7), settings)).toBe(true);
    expect(canReview(completed, afterCompletion(7, 1), settings)).toBe(false);
  });

  it('is closed for a deal that did not complete', () => {
    for (const status of [
      'CANCELLED',
      'DECLINED',
      'EXPIRED',
      'REQUESTED',
      'ACTIVE',
      'RETURNED',
      'DISPUTED',
    ] as const) {
      expect(canReview(given(status), NOW, DEFAULT_BOOKING_SETTINGS)).toBe(false);
    }
  });
});
