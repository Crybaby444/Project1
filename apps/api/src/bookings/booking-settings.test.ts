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

describe('the fee, the free first days and the high-value thresholds (owner, 2026-11-26)', () => {
  it('is 10 %, with 30 free days for a new account, when nothing is set', () => {
    expect(feeSettingsFromEnv({})).toEqual(DEFAULT_BOOKING_SETTINGS);
    expect(DEFAULT_BOOKING_SETTINGS.welcomeFeeDays).toBe(30);
  });

  it('takes FEE_PERCENT, and lets a stored row override it', () => {
    const base = feeSettingsFromEnv({ FEE_PERCENT: 12 });
    expect(base.servicePercent).toBe(12);
    expect(bookingSettingsFrom(new Map([['fees.servicePercent', 8]]), base).settings.servicePercent).toBe(8);
  });

  it('stores the thresholds in euros and uses them in cents', () => {
    const { settings } = bookingSettingsFrom(new Map([['checks.highValueDepositEur', 250], ['fees.welcomeDays', 0]]));
    expect(settings.highValueDepositCents).toBe(25_000);
    expect(settings.welcomeFeeDays).toBe(0);
  });

  it('ignores a stored value the rules refuse', () => {
    const { settings, invalid } = bookingSettingsFrom(new Map([['fees.welcomeDays', -3]]));
    expect(settings.welcomeFeeDays).toBe(30);
    expect(invalid).toEqual(['fees.welcomeDays']);
  });
});
