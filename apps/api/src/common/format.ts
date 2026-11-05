import { isLocale, type Locale } from '@yoyo/shared';

/**
 * A calendar day for people: "March 2, 2027", "2 марта 2027 г.", and "02.03.2027." in Latvian, whose
 * long dates come in the nominative ("2. marts") and read wrong inside a sentence.
 */
export function formatDay(day: string, locale: string): string {
  const known: Locale = isLocale(locale) ? locale : 'en';
  const style: Intl.DateTimeFormatOptions = known === 'lv' ? { day: '2-digit', month: '2-digit', year: 'numeric' } : { dateStyle: 'long' };
  return new Intl.DateTimeFormat(known, { ...style, timeZone: 'UTC' }).format(new Date(`${day}T12:00:00Z`));
}
