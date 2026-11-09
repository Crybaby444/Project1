import { endOfDayIn, localDate, type LocalDate } from './dates';
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
  /** Service fee paid by the renter, in whole percent of the rent (outside the launch offer). */
  readonly servicePercent: number;
  /** The fee during the launch offer, in whole percent (owner's decision of 2026-11-06: 0 %). */
  readonly promoServicePercent: number;
  /**
   * The last day of the launch offer, in the listing's time zone, or null when there is none. A request
   * sent before the end of that day pays `promoServicePercent`; from the next day on, `servicePercent`.
   */
  readonly promoServiceUntil: LocalDate | null;
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
  promoServicePercent: 0,
  promoServiceUntil: null,
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
  for (const field of ['servicePercent', 'promoServicePercent'] as const) {
    const percent: unknown = s[field];
    if (typeof percent !== 'number' || !Number.isInteger(percent) || percent < 0 || percent > 100) {
      invalidSetting(field, percent);
    }
  }
  const until: unknown = s.promoServiceUntil;
  if (until !== null) {
    try {
      if (typeof until !== 'string') throw new DomainError('INVALID_DATE');
      localDate(until);
    } catch (error) {
      if (!(error instanceof DomainError)) throw error;
      invalidSetting('promoServiceUntil', until);
    }
  }
  for (const field of ['maxAdvanceDays', 'reviewWindowDays'] as const) {
    const value: unknown = s[field];
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) invalidSetting(field, value);
  }
}

/** The fee a request sent at `now` pays: the percent and, during the launch offer, its last day. */
export interface ServiceFee {
  readonly percent: number;
  readonly promoUntil: LocalDate | null;
}

/**
 * The service fee that applies at `now` for an item in `timeZone`: the launch offer's percent until the
 * end of `promoServiceUntil` there (exclusive: the first moment of the next day pays the regular fee),
 * otherwise `servicePercent`. `createRequest` freezes the answer into the booking's quote.
 */
export function serviceFeeAt(settings: BookingSettings, now: Date, timeZone: string): ServiceFee {
  const until = settings.promoServiceUntil;
  if (until !== null && now.getTime() < endOfDayIn(until, timeZone).getTime()) {
    return { percent: settings.promoServicePercent, promoUntil: until };
  }
  return { percent: settings.servicePercent, promoUntil: null };
}
