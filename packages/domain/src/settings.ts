import { DomainError } from './errors';

/**
 * Deadlines, the fee and limits the booking rules use. The API reads them from the `Setting` table
 * and passes them in; the core never reads a database.
 */
export interface BookingSettings {
  /** An unanswered request expires after this many hours (or at the end of the first rental day). */
  readonly requestTtlHours: number;
  /** An accepted booking that is not paid expires after this many hours (or at the end of the first day). */
  readonly paymentTtlHours: number;
  /** After the owner marks "handed over", the renter has this long to object; then the handover counts. */
  readonly handoverConfirmHours: number;
  /** After the renter marks "returned", the owner has this long to object; then the return counts. */
  readonly returnConfirmHours: number;
  /** The owner inspects the returned item within this time, or it counts as "all fine". */
  readonly inspectionHours: number;
  /** The renter answers a damage claim within this time, or it goes to an admin. */
  readonly damageReplyHours: number;
  /** Service fee paid by the renter, in whole percent of the rent. */
  readonly servicePercent: number;
  /** How many days ahead a rental may start. */
  readonly maxAdvanceDays: number;
  /** How long after a completed deal both sides may leave a review. */
  readonly reviewWindowDays: number;
}

export const DEFAULT_BOOKING_SETTINGS: BookingSettings = Object.freeze({
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

const HOUR_FIELDS = [
  'requestTtlHours',
  'paymentTtlHours',
  'handoverConfirmHours',
  'returnConfirmHours',
  'inspectionHours',
  'damageReplyHours',
] as const satisfies readonly (keyof BookingSettings)[];

function invalidSetting(field: keyof BookingSettings, value: unknown): never {
  throw new DomainError('INVALID_INPUT', { field: `settings.${field}`, value: String(value) });
}

/**
 * Refuses settings that would break the rules: a missing or NaN number of hours would arm a timer
 * that is due at once (`INVALID_INPUT`, `details.field = 'settings.<name>'`). Hours are finite and
 * above 0 (fractions allowed); `servicePercent` is a whole number from 0 to 100; `maxAdvanceDays` and
 * `reviewWindowDays` are whole numbers above 0. `createRequest`, `decide` and `availableActions` call
 * it first.
 */
export function validateBookingSettings(s: BookingSettings): void {
  if (typeof s !== 'object' || s === null) throw new DomainError('INVALID_INPUT', { field: 'settings' });
  for (const field of HOUR_FIELDS) {
    const value: unknown = s[field];
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) invalidSetting(field, value);
  }
  const percent: unknown = s.servicePercent;
  if (typeof percent !== 'number' || !Number.isInteger(percent) || percent < 0 || percent > 100) {
    invalidSetting('servicePercent', percent);
  }
  for (const field of ['maxAdvanceDays', 'reviewWindowDays'] as const) {
    const value: unknown = s[field];
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) invalidSetting(field, value);
  }
}
