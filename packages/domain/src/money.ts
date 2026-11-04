import type { Locale } from '@yoyo/shared';
import { DomainError } from './errors';

/**
 * An amount of money in whole euro cents, never negative. Yoyo works in EUR only, and money never
 * holds fractions: every amount is created through `cents()` and every percentage is rounded once.
 */
export type Cents = number & { readonly __cents: unique symbol };

/** Checks that `value` is a whole, non-negative, safe number of cents. */
export function cents(value: number): Cents {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new DomainError('INVALID_AMOUNT', { value });
  }
  return value as Cents;
}

export function add(...values: Cents[]): Cents {
  return cents(values.reduce<number>((sum, value) => sum + value, 0));
}

/** `a − b`; a result below zero is an error, not a negative amount. */
export function sub(a: Cents, b: Cents): Cents {
  return cents(a - b);
}

/** `a × n` for a whole count `n`, such as a number of days. */
export function mulInt(a: Cents, n: number): Cents {
  if (!Number.isSafeInteger(n) || n < 0) {
    throw new DomainError('INVALID_INPUT', { field: 'multiplier', value: n });
  }
  return cents(a * n);
}

/**
 * `percent` % of `amount`, rounded to the cent, half up: `⌊(amount × percent + 50) / 100⌋`.
 * Percents are whole numbers from 0 to 100.
 */
export function percentOf(amount: Cents, percent: number): Cents {
  if (!Number.isInteger(percent) || percent < 0 || percent > 100) {
    throw new DomainError('INVALID_PERCENT', { percent });
  }
  const scaled = amount * percent + 50;
  if (!Number.isSafeInteger(scaled)) {
    throw new DomainError('INVALID_AMOUNT', { value: amount });
  }
  return cents(Math.floor(scaled / 100));
}

const LOCALE_TAGS: Record<Locale, string> = { en: 'en-IE', lv: 'lv-LV', ru: 'ru-RU' };

const formatters = new Map<Locale, Intl.NumberFormat>();

function formatterFor(locale: Locale): Intl.NumberFormat {
  if (!Object.hasOwn(LOCALE_TAGS, locale)) {
    throw new DomainError('INVALID_INPUT', { field: 'locale', value: locale });
  }
  let formatter = formatters.get(locale);
  if (formatter === undefined) {
    formatter = new Intl.NumberFormat(LOCALE_TAGS[locale], {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      // Latvian data leaves four-digit numbers ungrouped ("1234,50 €"); Yoyo groups every
      // thousand so prices line up the same way in all three languages.
      useGrouping: 'always',
    });
    formatters.set(locale, formatter);
  }
  return formatter;
}

/** Formats an amount for people, e.g. `€1,234.50` (en), `1 234,50 €` (lv, ru). */
export function formatMoney(amount: Cents, locale: Locale): string {
  const exact = cents(amount);
  const fraction = exact % 100;
  const euros = (exact - fraction) / 100;
  // A decimal string keeps every cent exact; dividing by 100 would go through a binary fraction.
  const decimal = `${euros}.${String(fraction).padStart(2, '0')}` as `${number}`;
  return formatterFor(locale).format(decimal);
}
