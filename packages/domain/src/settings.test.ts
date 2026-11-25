import { SETTING_DEFAULTS } from '@yoyo/shared';
import { describe, expect, it } from 'vitest';
import { DEFAULT_BOOKING_SETTINGS, serviceFeeAt,
  welcomeFeeEnds, validateBookingSettings } from './settings';
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
      welcomeFeeDays: 30,
      highValueDepositCents: 30_000,
      highValueRentCents: 50_000,
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
      ['fees.welcomeDays', 'welcomeFeeDays'],
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
  const FIELDS = Object.keys(DEFAULT_BOOKING_SETTINGS) as (keyof BookingSettings)[];
  // These may be 0: no fee, no free first days, every deal checked.
  const ZERO_OK: readonly string[] = ['servicePercent', 'welcomeFeeDays', 'highValueDepositCents', 'highValueRentCents'];
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
    if (!ZERO_OK.includes(field)) {
      expect(() => validateBookingSettings({ ...DEFAULT_BOOKING_SETTINGS, [field]: 0 })).toThrow(
        invalid(field),
      );
    }
  });

  it('allows fractional hours but whole percent and whole days only', () => {
    expect(() =>
      validateBookingSettings({ ...DEFAULT_BOOKING_SETTINGS, inspectionHours: 0.5 }),
    ).not.toThrow();
    for (const field of ['servicePercent', 'welcomeFeeDays', 'maxAdvanceDays', 'reviewWindowDays'] as const) {
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

describe('a new account\'s first days without the fee (owner, 2026-11-26)', () => {
  const riga = 'Europe/Riga';
  // Signed up at noon (Riga) on 1 December 2026: 30 free days end at noon on 31 December.
  const joined = new Date('2026-12-01T10:00:00Z');

  it('charges nothing within the first days, and says until which day', () => {
    expect(serviceFeeAt(DEFAULT_BOOKING_SETTINGS, new Date('2026-12-15T12:00:00Z'), riga, joined)).toEqual({ percent: 0, promoUntil: '2026-12-31' });
  });

  it('charges the regular fee from the moment they end', () => {
    expect(serviceFeeAt(DEFAULT_BOOKING_SETTINGS, new Date('2026-12-31T09:59:59.999Z'), riga, joined).percent).toBe(0);
    expect(serviceFeeAt(DEFAULT_BOOKING_SETTINGS, new Date('2026-12-31T10:00:00Z'), riga, joined)).toEqual({ percent: 10, promoUntil: null });
  });

  it('charges the regular fee to a price without a renter, and when the free days are off', () => {
    expect(serviceFeeAt(DEFAULT_BOOKING_SETTINGS, new Date('2026-12-02T00:00:00Z'), riga)).toEqual({ percent: 10, promoUntil: null });
    expect(serviceFeeAt({ ...DEFAULT_BOOKING_SETTINGS, welcomeFeeDays: 0 }, new Date('2026-12-02T00:00:00Z'), riga, joined)).toEqual({ percent: 10, promoUntil: null });
    expect(welcomeFeeEnds({ ...DEFAULT_BOOKING_SETTINGS, welcomeFeeDays: 0 }, joined)).toBeNull();
  });
});
