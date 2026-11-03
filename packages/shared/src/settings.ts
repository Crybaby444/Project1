/** Defaults for runtime settings stored in the database (spec §4.4). */
export const SETTING_DEFAULTS = {
  'booking.requestTtlHours': 24,
  'booking.inspectionHours': 48,
  'booking.damageReplyHours': 48,
  'review.windowDays': 14,
  'fees.servicePercent': 10,
} as const satisfies Record<string, number>;

export type SettingKey = keyof typeof SETTING_DEFAULTS;

export type SettingValue<K extends SettingKey> = (typeof SETTING_DEFAULTS)[K] extends number
  ? number
  : (typeof SETTING_DEFAULTS)[K];
