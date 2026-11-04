import { isLocale, type Locale } from '@yoyo/shared';
import en from '../i18n/en.json';
import lv from '../i18n/lv.json';
import ru from '../i18n/ru.json';

export type MailTexts = typeof en;

const TEXTS: Record<Locale, MailTexts> = { en, lv, ru };

/** Texts for the recipient's language; unknown languages get English. */
export function textsFor(locale: string): { locale: Locale; t: MailTexts } {
  const known: Locale = isLocale(locale) ? locale : 'en';
  return { locale: known, t: TEXTS[known] };
}

/** Fills `{name}`-style placeholders. The result is plain text: React escapes it when rendering. */
export function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (placeholder, key: string) => values[key] ?? placeholder);
}
