import { SETTING_DEFAULTS } from '@yoyo/shared';
import { describe, expect, it } from 'vitest';
import { DEFAULT_BOOKING_SETTINGS } from './settings';
import type { BookingSettings } from './settings';

describe('DEFAULT_BOOKING_SETTINGS', () => {
  it('holds the deadlines, fee and limits of the plan', () => {
    expect(DEFAULT_BOOKING_SETTINGS).toEqual({
      requestTtlHours: 24,
      paymentTtlHours: 24,
      handoverConfirmHours: 48,
      returnConfirmHours: 48,
      inspectionHours: 48,
      damageReplyHours: 48,
      servicePercent: 10,
      maxAdvanceDays: 365,
      reviewWindowDays: 14,
    });
  });

  it('agrees with the runtime settings the API stores (SETTING_DEFAULTS) wherever both have a value', () => {
    const counterpart: ReadonlyArray<readonly [keyof typeof SETTING_DEFAULTS, keyof BookingSettings]> = [
      ['booking.requestTtlHours', 'requestTtlHours'],
      ['booking.inspectionHours', 'inspectionHours'],
      ['booking.damageReplyHours', 'damageReplyHours'],
      ['review.windowDays', 'reviewWindowDays'],
      ['fees.servicePercent', 'servicePercent'],
    ];
    for (const [key, field] of counterpart) {
      expect({ [key]: DEFAULT_BOOKING_SETTINGS[field] }).toEqual({ [key]: SETTING_DEFAULTS[key] });
    }
  });

  it('cannot be changed by a caller', () => {
    expect(Object.isFrozen(DEFAULT_BOOKING_SETTINGS)).toBe(true);
  });
});
