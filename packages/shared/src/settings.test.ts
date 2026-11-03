import { describe, expect, it } from 'vitest';
import { SETTING_DEFAULTS } from './settings.js';

describe('settings', () => {
  it('matches the defaults from the spec §4.4', () => {
    expect(SETTING_DEFAULTS).toEqual({
      'booking.requestTtlHours': 24,
      'booking.inspectionHours': 48,
      'booking.damageReplyHours': 48,
      'review.windowDays': 14,
      'fees.servicePercent': 10,
    });
  });
});
