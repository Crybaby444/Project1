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

/** Month names after "с" / "kopš" ("since"): Russian and Latvian take the genitive there. */
const GENITIVE_MONTHS: Record<string, readonly string[]> = {
  ru: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
  lv: ['janvāra', 'februāra', 'marta', 'aprīļa', 'maija', 'jūnija', 'jūlija', 'augusta', 'septembra', 'oktobra', 'novembra', 'decembra'],
};

/**
 * The month someone joined, worded to follow "since" in the page's language: «ноября 2026 г.» (На Yoyo с …),
 * «2026. gada novembra» (Yoyo kopš …), "November 2026" (On Yoyo since …). Intl only gives the nominative
 * («ноябрь 2026 г.», which read «с ноябрь»), and its month-and-year pattern differs between the server and the
 * browser, so the words are put together here, the same everywhere. The month is the one in Riga.
 */
export function sinceLabel(iso: string, locale: string): string {
  const [year, month] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Riga', year: 'numeric', month: '2-digit' })
    .format(new Date(iso))
    .split('-')
    .map(Number) as [number, number];
  if (locale === 'ru') return `${GENITIVE_MONTHS.ru![month - 1]} ${year} г.`;
  if (locale === 'lv') return `${year}. gada ${GENITIVE_MONTHS.lv![month - 1]}`;
  const name = new Intl.DateTimeFormat('en-GB', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, 15)));
  return `${name} ${year}`;
}
