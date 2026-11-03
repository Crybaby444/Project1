/**
 * Runtime-adjustable settings with their defaults (spec §4.4).
 * Stored in the `Setting` table; a missing row means the default applies.
 */
export const SETTING_DEFAULTS = {
  /** An unanswered booking request expires after this many hours. */
  'booking.requestTtlHours': 24,
  /** If the owner does not inspect the returned item in time, it counts as "all fine". */
  'booking.inspectionHours': 48,
  /** If the renter does not answer a damage claim in time, the dispute goes to an admin. */
  'booking.damageReplyHours': 48,
  /** How long after a closed deal both sides may leave a review. */
  'review.windowDays': 14,
  /** Service fee paid by the renter, in percent of the rental price. */
  'fees.servicePercent': 10,
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;

/** Widens a literal default (e.g. `10`) to its primitive type, so other values can be stored. */
type Widen<T> = T extends number ? number : T extends string ? string : T extends boolean ? boolean : T;

export type SettingValue<K extends SettingKey> = Widen<(typeof SETTING_DEFAULTS)[K]>;
