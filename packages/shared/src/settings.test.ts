import { describe, expect, it } from 'vitest';
import { SETTING_DEFAULTS } from './settings';

describe('SETTING_DEFAULTS', () => {
  it('matches the deadlines and fee fixed by the spec (§4.4)', () => {
    expect(SETTING_DEFAULTS).toEqual({
      'booking.requestTtlHours': 24,
      'booking.paymentTtlHours': 24,
      'booking.handoverConfirmHours': 48,
      'booking.returnConfirmHours': 48,
      'booking.maxAdvanceDays': 365,
      'booking.inspectionHours': 48,
      'booking.damageReplyHours': 48,
      'review.windowDays': 14,
      'fees.servicePercent': 10,
    });
  });
});
