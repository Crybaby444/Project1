import type { DatePeriod } from '@yoyo/shared';

/** Calendar days as the API writes them (`YYYY-MM-DD`), with arithmetic done in UTC so no clock shifts a day. */

const toUtc = (day: string) => {
  const [year, month, date] = day.split('-').map(Number) as [number, number, number];
  return Date.UTC(year, month - 1, date);
};
const fromUtc = (time: number) => new Date(time).toISOString().slice(0, 10);

export function addDays(day: string, days: number): string {
  return fromUtc(toUtc(day) + days * 86_400_000);
}

/** 0 = Sunday … 6 = Saturday. */
export function weekday(day: string): number {
  return new Date(toUtc(day)).getUTCDay();
}

/** Today's date where the listing is (its time zone decides when a day is over). */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export type GridDay = { date: string; inMonth: boolean };

/** The weeks of a month (1–12) as rows of 7 days, from `weekStartsOn` (0 Sunday, 1 Monday). */
export function monthGrid(year: number, month: number, weekStartsOn: 0 | 1): GridDay[][] {
  const first = `${year}-${String(month).padStart(2, '0')}-01`;
  const start = addDays(first, -((weekday(first) - weekStartsOn + 7) % 7));
  const weeks: GridDay[][] = [];
  let day = start;
  do {
    const week: GridDay[] = [];
    for (let i = 0; i < 7; i++) {
      week.push({ date: day, inMonth: day.slice(0, 7) === first.slice(0, 7) });
      day = addDays(day, 1);
    }
    weeks.push(week);
  } while (day.slice(0, 7) === first.slice(0, 7));
  return weeks;
}

/**
 * The first day of the week for a page language. Yoyo's English is British-style (the Baltics start
 * the week on Monday), so `en` reads as en-GB rather than Intl's default en-US (Sunday).
 */
export function weekStartFor(locale: string): 0 | 1 {
  try {
    const info = new Intl.Locale(locale === 'en' ? 'en-GB' : locale) as Intl.Locale & {
      getWeekInfo?(): { firstDay: number };
      weekInfo?: { firstDay: number };
    };
    const firstDay = info.getWeekInfo?.().firstDay ?? info.weekInfo?.firstDay ?? 1;
    return firstDay === 7 ? 0 : 1;
  } catch {
    return 1;
  }
}

export function isUnavailable(periods: DatePeriod[], day: string): boolean {
  return periods.some((period) => period.start <= day && day <= period.end);
}

/** Sorted, with overlapping and touching periods joined (as the API stores them). */
export function mergePeriods(periods: DatePeriod[]): DatePeriod[] {
  const sorted = [...periods].sort((a, b) => a.start.localeCompare(b.start));
  const merged: DatePeriod[] = [];
  for (const period of sorted) {
    const last = merged.at(-1);
    if (last && period.start <= addDays(last.end, 1)) {
      if (period.end > last.end) last.end = period.end;
    } else merged.push({ ...period });
  }
  return merged;
}

/** The periods without the days from `start` to `end`. */
export function removeRange(periods: DatePeriod[], start: string, end: string): DatePeriod[] {
  return periods.flatMap((period) => {
    if (period.end < start || period.start > end) return [period];
    const parts: DatePeriod[] = [];
    if (period.start < start) parts.push({ start: period.start, end: addDays(start, -1) });
    if (period.end > end) parts.push({ start: addDays(end, 1), end: period.end });
    return parts;
  });
}

export function toggleDay(periods: DatePeriod[], day: string): DatePeriod[] {
  return isUnavailable(periods, day)
    ? removeRange(periods, day, day)
    : mergePeriods([...periods, { start: day, end: day }]);
}

/** Marks the days from `a` to `b` (either order), or clears them when every one is marked already. */
export function toggleRange(periods: DatePeriod[], a: string, b: string): DatePeriod[] {
  const [start, end] = a <= b ? [a, b] : [b, a];
  const covered = periods.some((period) => period.start <= start && end <= period.end);
  return covered
    ? mergePeriods(removeRange(periods, start, end))
    : mergePeriods([...periods, { start, end }]);
}
