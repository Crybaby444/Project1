/**
 * Days and moments of a deal in the page language. A rental day (`YYYY-MM-DD`) has no time and no zone,
 * so it is formatted in UTC and never shifts; a moment (a deadline, a signature) is shown in the deal's
 * own time zone, where the item is.
 */

const asDay = (day: string) => new Date(`${day}T00:00:00Z`);

/** Yoyo's English reads British-style in the Baltics: "12 Nov 2026", not "Nov 12, 2026". */
export const dateLocale = (locale: string) => (locale === 'en' ? 'en-GB' : locale);

/** Intl puts thin and narrow spaces around range dashes and inside dates; plain ones wrap the same everywhere. */
const plain = (text: string) => text.replace(/[  ]/g, ' ');

/** "12 Nov 2026" / "2026. gada 12. nov." / "12 нояб. 2026 г." */
export function formatDay(day: string, locale: string): string {
  return plain(new Intl.DateTimeFormat(dateLocale(locale), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(asDay(day)));
}

/** "12–14 Nov 2026", or one day when start and end are the same. */
export function formatPeriod(start: string, end: string, locale: string): string {
  const format = new Intl.DateTimeFormat(dateLocale(locale), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  return plain(start === end ? format.format(asDay(start)) : format.formatRange(asDay(start), asDay(end)));
}

/** "12 Nov, 14:05" in the deal's time zone. */
export function formatMoment(iso: string, locale: string, timeZone: string): string {
  return plain(
    new Intl.DateTimeFormat(dateLocale(locale), {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      timeZone,
    }).format(new Date(iso)),
  );
}

/** Whole days from `start` to `end`, both included (the domain's rule: 12–14 Nov is 3 days). */
export function daysBetween(start: string, end: string): number {
  return Math.round((asDay(end).getTime() - asDay(start).getTime()) / 86_400_000) + 1;
}
