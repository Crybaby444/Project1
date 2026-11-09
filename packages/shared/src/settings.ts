/**
 * Runtime-adjustable settings with their defaults (spec §4.4).
 * Stored in the `Setting` table; a missing row means the default applies.
 */
export const SETTING_DEFAULTS = {
  /** An unanswered booking request expires after this many hours. */
  'booking.requestTtlHours': 24,
  /** An accepted booking that is not paid expires after this many hours (or at the end of its first day). */
  'booking.paymentTtlHours': 24,
  /** After the owner marks "handed over", the renter has this long to object. */
  'booking.handoverConfirmHours': 48,
  /** After the renter marks "returned", the owner has this long to object. */
  'booking.returnConfirmHours': 48,
  /** How many days ahead a rental may start. */
  'booking.maxAdvanceDays': 365,
  /** If the owner does not inspect the returned item in time, it counts as "all fine". */
  'booking.inspectionHours': 48,
  /** If the renter does not answer a damage claim in time, the dispute goes to an admin. */
  'booking.damageReplyHours': 48,
  /** How long after a closed deal both sides may leave a review. */
  'review.windowDays': 14,
  /** Service fee paid by the renter, in percent of the rental price (outside the launch offer). */
  'fees.servicePercent': 10,
  /** The fee during the launch offer, in percent (owner's decision of 2026-11-06: 0 % for 3 months). */
  'fees.promoServicePercent': 0,
  /** The launch offer's last day (`YYYY-MM-DD`, where the item is); empty: no offer. */
  'fees.promoServiceUntil': '',
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;

/** Widens a literal default (e.g. `10`) to its primitive type, so other values can be stored. */
type Widen<T> = T extends number ? number : T extends string ? string : T extends boolean ? boolean : T;

export type SettingValue<K extends SettingKey> = Widen<(typeof SETTING_DEFAULTS)[K]>;
