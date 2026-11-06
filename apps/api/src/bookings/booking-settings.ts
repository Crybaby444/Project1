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
  promoServicePercent: 'fees.promoServicePercent',
  promoServiceUntil: 'fees.promoServiceUntil',
  maxAdvanceDays: 'booking.maxAdvanceDays',
  reviewWindowDays: 'review.windowDays',
};

/** The fee settings from the environment (FEE_PERCENT, FEE_PROMO_PERCENT, FEE_PROMO_UNTIL), over the domain defaults. */
export function feeSettingsFromEnv(env: { FEE_PERCENT?: number | undefined; FEE_PROMO_PERCENT?: number | undefined; FEE_PROMO_UNTIL?: string | undefined }): BookingSettings {
  return Object.freeze({
    ...DEFAULT_BOOKING_SETTINGS,
    ...(env.FEE_PERCENT !== undefined && { servicePercent: env.FEE_PERCENT }),
    ...(env.FEE_PROMO_PERCENT !== undefined && { promoServicePercent: env.FEE_PROMO_PERCENT }),
    ...(env.FEE_PROMO_UNTIL !== undefined && { promoServiceUntil: env.FEE_PROMO_UNTIL as BookingSettings['promoServiceUntil'] }),
  });
}

/** A stored value as the domain field takes it: the launch offer's last day is stored as '' for "none". */
const fieldValue = (field: keyof BookingSettings, value: unknown) => (field === 'promoServiceUntil' && value === '' ? null : value);

/**
 * The deal rules' settings from stored values over `base` (the domain defaults, with the fee from the
 * environment). A stored value the rules would refuse (0 hours, a fractional percent…) is ignored and
 * named in `invalid`, so one bad row never stops every deal.
 */
export function bookingSettingsFrom(
  stored: ReadonlyMap<string, unknown>,
  base: BookingSettings = DEFAULT_BOOKING_SETTINGS,
): { settings: BookingSettings; invalid: SettingKey[] } {
  const settings: Record<string, unknown> = { ...base };
  const invalid: SettingKey[] = [];
  for (const [field, key] of Object.entries(SETTING_KEY_OF) as [keyof BookingSettings, SettingKey][]) {
    if (!stored.has(key)) continue;
    const candidate = { ...base, [field]: fieldValue(field, stored.get(key)) } as BookingSettings;
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
