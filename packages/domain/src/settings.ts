import { localDateIn, type LocalDate } from './dates';
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
  /**
   * A new account's first days without the fee (owner, 2026-11-26: the first month after sign-up, instead
   * of a launch offer for everyone): a request sent within this many days of the renter's sign-up pays 0 %.
   * 0 turns it off.
   */
  readonly welcomeFeeDays: number;
  /**
   * From this deposit, or this rent, a deal is high-value and the renter must have confirmed both phone and
   * identity (value checks, D4). In cents.
   */
  readonly highValueDepositCents: number;
  readonly highValueRentCents: number;
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
  welcomeFeeDays: 30,
  highValueDepositCents: 30_000,
  highValueRentCents: 50_000,
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
  for (const field of ['welcomeFeeDays', 'highValueDepositCents', 'highValueRentCents'] as const) {
    const value: unknown = s[field];
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) invalidSetting(field, value);
  }
  for (const field of ['maxAdvanceDays', 'reviewWindowDays'] as const) {
    const value: unknown = s[field];
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) invalidSetting(field, value);
  }
}

/** The fee a request sent at `now` pays: the percent and, in the renter's free first days, the last of them. */
export interface ServiceFee {
  readonly percent: number;
  readonly promoUntil: LocalDate | null;
}

/** The moment a new account's fee-free days end, or null when there are none. */
export function welcomeFeeEnds(settings: BookingSettings, joinedAt: Date | null): Date | null {
  if (joinedAt === null || settings.welcomeFeeDays <= 0) return null;
  return new Date(joinedAt.getTime() + settings.welcomeFeeDays * 86_400_000);
}

/**
 * The service fee a request sent at `now` pays: 0 % while the renter is within their first
 * `welcomeFeeDays` after sign-up (`promoUntil` is then the last of those days, in `timeZone`), otherwise
 * `servicePercent`. Without a renter (a price shown to a visitor) the regular fee. `createRequest` freezes
 * the answer into the booking's quote.
 */
export function serviceFeeAt(settings: BookingSettings, now: Date, timeZone: string, renterJoinedAt: Date | null = null): ServiceFee {
  const ends = welcomeFeeEnds(settings, renterJoinedAt);
  if (ends !== null && now.getTime() < ends.getTime()) {
    return { percent: 0, promoUntil: localDateIn(new Date(ends.getTime() - 1), timeZone) };
  }
  return { percent: settings.servicePercent, promoUntil: null };
}
