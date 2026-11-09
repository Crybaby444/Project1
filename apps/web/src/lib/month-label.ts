/**
 * A calendar heading, "November 2026", the same on the server and in the browser.
 *
 * Intl's joined "month + year" pattern differs between Node's ICU and the browser's (Latvian:
 * "2026. gada. novembris" on the server, "2026. g. novembris" in Chrome), and a different text
 * breaks hydration. The bare month name is the same in both, so the year is added by hand.
 */
export function monthLabel(locale: string) {
  const month = new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' });
  return { format: (date: Date) => `${month.format(date)} ${date.getUTCFullYear()}` };
}
