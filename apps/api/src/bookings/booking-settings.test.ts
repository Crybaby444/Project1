import { DEFAULT_BOOKING_SETTINGS } from '@yoyo/domain';
import { describe, expect, it } from 'vitest';
import { bookingSettingsFrom } from './booking-settings';

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
