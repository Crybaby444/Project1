import { DEFAULT_BOOKING_SETTINGS } from '@yoyo/domain';
import { describe, expect, it } from 'vitest';
import { bookingSettingsFrom, feeSettingsFromEnv } from './booking-settings';

describe('bookingSettingsFrom', () => {
  it('is the domain default when nothing is stored', () => {
    expect(bookingSettingsFrom(new Map())).toEqual({ settings: DEFAULT_BOOKING_SETTINGS, invalid: [] });
  });

  it('takes stored values over the defaults', () => {
    const { settings } = bookingSettingsFrom(
      new Map<string, unknown>([
        ['booking.inspectionHours', 72],
        ['fees.servicePercent', 12],
        ['review.windowDays', 30],
      ]),
    );
    expect(settings).toEqual({ ...DEFAULT_BOOKING_SETTINGS, inspectionHours: 72, servicePercent: 12, reviewWindowDays: 30 });
  });

  it('falls back to the default for a value the rules would refuse, and names it', () => {
    const { settings, invalid } = bookingSettingsFrom(
      new Map<string, unknown>([
        ['booking.requestTtlHours', 0],
        ['fees.servicePercent', 10.5],
        ['booking.paymentTtlHours', 'soon'],
      ]),
    );
    expect(settings).toEqual(DEFAULT_BOOKING_SETTINGS);
    expect(invalid.sort()).toEqual(['booking.paymentTtlHours', 'booking.requestTtlHours', 'fees.servicePercent']);
  });
});

describe('the service fee from the environment and the Setting table (owner decision of 2026-11-06)', () => {
  it('is 10 %, with no launch offer, when nothing is set', () => {
    expect(feeSettingsFromEnv({})).toEqual(DEFAULT_BOOKING_SETTINGS);
  });

  it('takes FEE_PERCENT, FEE_PROMO_PERCENT and FEE_PROMO_UNTIL', () => {
    expect(feeSettingsFromEnv({ FEE_PERCENT: 12, FEE_PROMO_PERCENT: 0, FEE_PROMO_UNTIL: '2027-02-05' })).toMatchObject({
      servicePercent: 12,
      promoServicePercent: 0,
      promoServiceUntil: '2027-02-05',
    });
  });

  it('lets stored rows override the environment, and an empty last day end the offer', () => {
    const base = feeSettingsFromEnv({ FEE_PROMO_UNTIL: '2027-02-05' });
    expect(bookingSettingsFrom(new Map([['fees.promoServiceUntil', '2027-03-01']]), base).settings.promoServiceUntil).toBe('2027-03-01');
    expect(bookingSettingsFrom(new Map([['fees.promoServiceUntil', '']]), base).settings.promoServiceUntil).toBeNull();
    expect(bookingSettingsFrom(new Map(), base).settings.promoServiceUntil).toBe('2027-02-05');
  });

  it('ignores a stored last day that is not a date', () => {
    const { settings, invalid } = bookingSettingsFrom(new Map([['fees.promoServiceUntil', '5 Feb']]));
    expect(settings.promoServiceUntil).toBeNull();
    expect(invalid).toEqual(['fees.promoServiceUntil']);
  });
});
