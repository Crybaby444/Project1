import { DomainError } from './errors';

/**
 * A calendar day, `YYYY-MM-DD`, with no time of day and no time zone. Rentals are counted in whole
 * days of the item's own time zone; day arithmetic runs on Y-M-D in UTC, so clock changes never
 * add or remove a day.
 */
export type LocalDate = string & { readonly __localDate: unique symbol };

/** The time zone of an item unless its listing says otherwise. */
export const DEFAULT_TIME_ZONE = 'Europe/Riga';

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const YYYY_MM_DD = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Milliseconds since the epoch at UTC midnight of a Y-M-D (month 1–12; out-of-range parts roll over). */
function utcMidnight(year: number, month: number, day: number): number {
  const instant = new Date(0);
  instant.setUTCFullYear(year, month - 1, day);
  return instant.getTime();
}

/** Checks that `value` is written as `YYYY-MM-DD` and names a day that exists. */
export function localDate(value: string): LocalDate {
  const match = YYYY_MM_DD.exec(value);
  if (match !== null) {
    const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
    const instant = new Date(utcMidnight(year, month, day));
    if (
      instant.getUTCFullYear() === year &&
      instant.getUTCMonth() === month - 1 &&
      instant.getUTCDate() === day
    ) {
      return value as LocalDate;
    }
  }
  throw new DomainError('INVALID_DATE', { value });
}

function dayNumber(date: LocalDate): number {
  return utcMidnight(Number(date.slice(0, 4)), Number(date.slice(5, 7)), Number(date.slice(8, 10))) / DAY_MS;
}

function fromDayNumber(days: number): LocalDate {
  const instant = new Date(days * DAY_MS);
  const year = String(instant.getUTCFullYear()).padStart(4, '0');
  const month = String(instant.getUTCMonth() + 1).padStart(2, '0');
  const day = String(instant.getUTCDate()).padStart(2, '0');
  return localDate(`${year}-${month}-${day}`);
}

export function addDays(date: LocalDate, days: number): LocalDate {
  if (!Number.isSafeInteger(days)) {
    throw new DomainError('INVALID_INPUT', { field: 'days', value: days });
  }
  return fromDayNumber(dayNumber(date) + days);
}

/** `b − a` in calendar days. */
export function diffDays(a: LocalDate, b: LocalDate): number {
  return dayNumber(b) - dayNumber(a);
}

export function compareDates(a: LocalDate, b: LocalDate): -1 | 0 | 1 {
  // `YYYY-MM-DD` sorts as text in calendar order.
  if (a < b) return -1;
  return a > b ? 1 : 0;
}

const dayFormatters = new Map<string, Intl.DateTimeFormat>();

function dayFormatter(timeZone: string): Intl.DateTimeFormat {
  // Without a time zone, Intl would silently use the server's own.
  if (typeof timeZone !== 'string' || timeZone === '') {
    throw new DomainError('INVALID_INPUT', { field: 'timeZone', value: String(timeZone) });
  }
  let formatter = dayFormatters.get(timeZone);
  if (formatter === undefined) {
    try {
      formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        calendar: 'gregory',
        numberingSystem: 'latn',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      throw new DomainError('INVALID_INPUT', { field: 'timeZone', value: timeZone });
    }
    dayFormatters.set(timeZone, formatter);
  }
  return formatter;
}

/** The calendar day it is in `timeZone` at `instant`. "Today" for an item is `localDateIn(now, item zone)`. */
export function localDateIn(instant: Date, timeZone: string): LocalDate {
  const formatter = dayFormatter(timeZone);
  if (Number.isNaN(instant.getTime())) {
    throw new DomainError('INVALID_DATE', { value: String(instant) });
  }
  const parts = { year: '', month: '', day: '' };
  for (const part of formatter.formatToParts(instant)) {
    if (part.type === 'year' || part.type === 'month' || part.type === 'day') parts[part.type] = part.value;
  }
  return localDate(`${parts.year.padStart(4, '0')}-${parts.month}-${parts.day}`);
}

/**
 * The end of `date` in `timeZone`: the first instant at which the local calendar shows the next day.
 * Usually that is local midnight; where clocks jump over midnight, it is the moment of the jump.
 * Found by bisection over ±26 hours around UTC midnight (wider than any UTC offset), so 23- and
 * 25-hour days need no special case.
 */
export function endOfDayIn(date: LocalDate, timeZone: string): Date {
  const next = addDays(date, 1);
  const utcMidnightOfNext = dayNumber(next) * DAY_MS;
  let stillDate = utcMidnightOfNext - 26 * HOUR_MS;
  let alreadyNext = utcMidnightOfNext + 26 * HOUR_MS;
  while (alreadyNext - stillDate > 1) {
    const middle = stillDate + Math.floor((alreadyNext - stillDate) / 2);
    if (compareDates(localDateIn(new Date(middle), timeZone), next) < 0) stillDate = middle;
    else alreadyNext = middle;
  }
  return new Date(alreadyNext);
}

/** Days from `start` to `end`, both included. */
export interface Period {
  readonly start: LocalDate;
  readonly end: LocalDate;
}

export function period(start: LocalDate, end: LocalDate): Period {
  if (compareDates(end, start) < 0) {
    throw new DomainError('INVALID_PERIOD', { start, end });
  }
  return { start, end };
}

/** Number of days in a period: `end − start + 1`. */
export function daysIn(p: Period): number {
  return diffDays(p.start, p.end) + 1;
}

/** True when the two periods share at least one day. */
export function overlaps(a: Period, b: Period): boolean {
  return compareDates(a.start, b.end) <= 0 && compareDates(b.start, a.end) <= 0;
}

/**
 * Among `blocked`, the period that collides with `p` and starts earliest (on a tie, the first one
 * given), or `null` when every day of `p` is free.
 */
export function firstConflict(p: Period, blocked: readonly Period[]): Period | null {
  let first: Period | null = null;
  for (const other of blocked) {
    if (overlaps(p, other) && (first === null || compareDates(other.start, first.start) < 0)) first = other;
  }
  return first;
}

export interface RentalRules {
  /** The current day in the item's time zone. */
  readonly today: LocalDate;
  readonly minDays: number;
  readonly maxDays: number;
  /** How many days ahead of today a rental may start. */
  readonly maxAdvanceDays: number;
}

/** Checks when a rental may start and how long it may last; throws the first rule it breaks. */
export function validateRentalPeriod(p: Period, rules: RentalRules): void {
  if (compareDates(p.start, rules.today) < 0) {
    throw new DomainError('START_IN_PAST', { start: p.start, today: rules.today });
  }
  const latestStart = addDays(rules.today, rules.maxAdvanceDays);
  if (compareDates(p.start, latestStart) > 0) {
    throw new DomainError('TOO_FAR_AHEAD', { start: p.start, latestStart });
  }
  const days = daysIn(p);
  if (days < rules.minDays) {
    throw new DomainError('PERIOD_TOO_SHORT', { days, minDays: rules.minDays });
  }
  if (days > rules.maxDays) {
    throw new DomainError('PERIOD_TOO_LONG', { days, maxDays: rules.maxDays });
  }
}
