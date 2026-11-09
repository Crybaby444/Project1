import type { DatePeriod } from '@yoyo/shared';

/** A period being picked: the first click sets the start, the second the end. */
export type Range = { start: string; end: string | null };

export function isBlockedDay(blocked: DatePeriod[], day: string): boolean {
  return blocked.some((p) => p.start <= day && day <= p.end);
}

/** Whether any day from `a` to `b` (inclusive, a ≤ b) is taken. */
export function spansBlocked(blocked: DatePeriod[], a: string, b: string): boolean {
  return blocked.some((p) => p.start <= b && a <= p.end);
}

/**
 * The range after clicking `day`: a new start when nothing or a whole period is chosen, when the day
 * is before the start, or when the period would cross a taken day; otherwise the end.
 */
export function pickDay(range: Range | null, day: string, blocked: DatePeriod[] = []): Range {
  if (range === null || range.end !== null || day < range.start || spansBlocked(blocked, range.start, day)) {
    return { start: day, end: null };
  }
  return { start: range.start, end: day };
}

/** Where `day` stands in the range, for the calendar's look and its screen-reader names. */
export function dayRole(range: Range | null, day: string, hover: string | null = null): 'start' | 'end' | 'inside' | 'preview' | null {
  if (!range) return null;
  if (day === range.start) return 'start';
  if (range.end !== null) {
    if (day === range.end) return 'end';
    return day > range.start && day < range.end ? 'inside' : null;
  }
  return hover !== null && day > range.start && day <= hover ? 'preview' : null;
}
