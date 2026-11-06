import { SETTING_DEFAULTS } from '@yoyo/shared';
import { describe, expect, it } from 'vitest';
import { DEFAULT_BOOKING_SETTINGS, serviceFeeAt, validateBookingSettings } from './settings';
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
      promoServicePercent: 0,
      promoServiceUntil: null,
      maxAdvanceDays: 365,
      reviewWindowDays: 14,
    });
  });

  it('agrees with the runtime settings the API stores (SETTING_DEFAULTS) wherever both have a value', () => {
    const counterpart: ReadonlyArray<readonly [keyof typeof SETTING_DEFAULTS, keyof BookingSettings]> = [
      ['booking.requestTtlHours', 'requestTtlHours'],
      ['booking.paymentTtlHours', 'paymentTtlHours'],
      ['booking.handoverConfirmHours', 'handoverConfirmHours'],
      ['booking.returnConfirmHours', 'returnConfirmHours'],
      ['booking.maxAdvanceDays', 'maxAdvanceDays'],
      ['booking.inspectionHours', 'inspectionHours'],
      ['booking.damageReplyHours', 'damageReplyHours'],
      ['review.windowDays', 'reviewWindowDays'],
      ['fees.servicePercent', 'servicePercent'],
      ['fees.promoServicePercent', 'promoServicePercent'],
    ];
    for (const [key, field] of counterpart) {
      expect({ [key]: DEFAULT_BOOKING_SETTINGS[field] }).toEqual({ [key]: SETTING_DEFAULTS[key] });
    }
  });

  it('cannot be changed by a caller', () => {
    expect(Object.isFrozen(DEFAULT_BOOKING_SETTINGS)).toBe(true);
  });
});

describe('validateBookingSettings', () => {
  // The launch offer's last day is a date or null, checked on its own below.
  const FIELDS = (Object.keys(DEFAULT_BOOKING_SETTINGS) as (keyof BookingSettings)[]).filter((f) => f !== 'promoServiceUntil');
  const invalid = (field: string) =>
    expect.objectContaining({
      code: 'INVALID_INPUT',
      details: expect.objectContaining({ field: `settings.${field}` }),
    });

  it('accepts the defaults', () => {
    expect(() => validateBookingSettings(DEFAULT_BOOKING_SETTINGS)).not.toThrow();
  });

  it.each(FIELDS)('refuses a missing, NaN, infinite, zero or negative %s', (field) => {
    const { [field]: _dropped, ...missing } = DEFAULT_BOOKING_SETTINGS;
    expect(() => validateBookingSettings(missing as BookingSettings)).toThrow(invalid(field));
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY, -1, '24' as unknown as number]) {
      expect(() => validateBookingSettings({ ...DEFAULT_BOOKING_SETTINGS, [field]: value })).toThrow(
        invalid(field),
      );
    }
    if (field !== 'servicePercent' && field !== 'promoServicePercent') {
      expect(() => validateBookingSettings({ ...DEFAULT_BOOKING_SETTINGS, [field]: 0 })).toThrow(
        invalid(field),
      );
    }
  });

  it('allows fractional hours but whole percent and whole days only', () => {
    expect(() =>
      validateBookingSettings({ ...DEFAULT_BOOKING_SETTINGS, inspectionHours: 0.5 }),
    ).not.toThrow();
    for (const field of ['servicePercent', 'promoServicePercent', 'maxAdvanceDays', 'reviewWindowDays'] as const) {
      expect(() => validateBookingSettings({ ...DEFAULT_BOOKING_SETTINGS, [field]: 1.5 })).toThrow(
        invalid(field),
      );
    }
  });

  it('takes a service fee from 0 to 100 percent', () => {
    for (const servicePercent of [0, 100]) {
      expect(() => validateBookingSettings({ ...DEFAULT_BOOKING_SETTINGS, servicePercent })).not.toThrow();
    }
    expect(() => validateBookingSettings({ ...DEFAULT_BOOKING_SETTINGS, servicePercent: 101 })).toThrow(
      invalid('servicePercent'),
    );
  });
});

describe('the launch offer on the service fee (owner decision of 2026-11-06)', () => {
  const invalid = expect.objectContaining({
    code: 'INVALID_INPUT',
    details: expect.objectContaining({ field: 'settings.promoServiceUntil' }),
  });
  // 0 % until the end of 5 February 2027 in Riga (UTC+2 in winter), 10 % after.
  const promo: BookingSettings = { ...DEFAULT_BOOKING_SETTINGS, promoServicePercent: 0, promoServiceUntil: '2027-02-05' as never };
  const riga = 'Europe/Riga';

  it('takes a valid day or null as the last day, and nothing else', () => {
    expect(() => validateBookingSettings(promo)).not.toThrow();
    for (const value of ['2027-02-30', '05.02.2027', '', 20270205]) {
      expect(() => validateBookingSettings({ ...promo, promoServiceUntil: value as never })).toThrow(invalid);
    }
  });

  it('charges the offer percent during the window', () => {
    expect(serviceFeeAt(promo, new Date('2026-11-06T12:00:00Z'), riga)).toEqual({ percent: 0, promoUntil: '2027-02-05' });
    expect(serviceFeeAt({ ...promo, promoServicePercent: 3 }, new Date('2027-02-05T12:00:00Z'), riga)).toEqual({
      percent: 3,
      promoUntil: '2027-02-05',
    });
  });

  it('charges the regular percent after the window', () => {
    expect(serviceFeeAt(promo, new Date('2027-03-01T00:00:00Z'), riga)).toEqual({ percent: 10, promoUntil: null });
  });

  it('ends exactly at midnight after the last day, where the item is', () => {
    // Midnight 5→6 February in Riga is 22:00 UTC on the 5th.
    expect(serviceFeeAt(promo, new Date('2027-02-05T21:59:59.999Z'), riga).percent).toBe(0);
    expect(serviceFeeAt(promo, new Date('2027-02-05T22:00:00.000Z'), riga).percent).toBe(10);
    // In London the same day ends two hours later.
    expect(serviceFeeAt(promo, new Date('2027-02-05T23:59:59.999Z'), 'Europe/London').percent).toBe(0);
  });

  it('is the regular fee when there is no offer', () => {
    expect(serviceFeeAt(DEFAULT_BOOKING_SETTINGS, new Date('2026-11-06T12:00:00Z'), riga)).toEqual({ percent: 10, promoUntil: null });
  });
});
