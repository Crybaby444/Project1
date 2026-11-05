import { DEFAULT_BOOKING_SETTINGS, DomainError, validateBookingSettings, type BookingSettings } from '@yoyo/domain';
import type { SettingKey } from '@yoyo/shared';

/** Where each rule setting is stored (the `Setting` table); every field of BookingSettings has one. */
export const SETTING_KEY_OF: Record<keyof BookingSettings, SettingKey> = {
  requestTtlHours: 'booking.requestTtlHours',
  paymentTtlHours: 'booking.paymentTtlHours',
  handoverConfirmHours: 'booking.handoverConfirmHours',
  returnConfirmHours: 'booking.returnConfirmHours',
  inspectionHours: 'booking.inspectionHours',
  damageReplyHours: 'booking.damageReplyHours',
  servicePercent: 'fees.servicePercent',
  maxAdvanceDays: 'booking.maxAdvanceDays',
  reviewWindowDays: 'review.windowDays',
};

/**
 * The deal rules' settings from stored values over the domain defaults. A stored value the rules
 * would refuse (0 hours, a fractional percent…) is ignored and named in `invalid`, so one bad row
 * never stops every deal.
 */
export function bookingSettingsFrom(stored: ReadonlyMap<string, unknown>): { settings: BookingSettings; invalid: SettingKey[] } {
  const settings: Record<string, unknown> = { ...DEFAULT_BOOKING_SETTINGS };
  const invalid: SettingKey[] = [];
  for (const [field, key] of Object.entries(SETTING_KEY_OF) as [keyof BookingSettings, SettingKey][]) {
    if (!stored.has(key)) continue;
    const candidate = { ...DEFAULT_BOOKING_SETTINGS, [field]: stored.get(key) } as BookingSettings;
    try {
      validateBookingSettings(candidate);
      settings[field] = candidate[field];
    } catch (error) {
      if (!(error instanceof DomainError)) throw error;
      invalid.push(key);
    }
  }
  return { settings: Object.freeze(settings) as unknown as BookingSettings, invalid };
}
