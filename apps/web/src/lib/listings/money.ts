/** Euro amounts as people type them ("12,50", "12.5", "1 200") and as cents the API stores. */

const AMOUNT = /^\d{1,9}(?:[.,]\d{1,2})?$/;

/**
 * Cents from what someone typed: a comma or a point before at most two decimals, spaces between
 * thousands. Empty means "no amount" (null); anything else that is not an amount gives NaN.
 */
export function parseEuros(text: string): number | null {
  const compact = text.replace(/[\s  ]/g, '');
  if (compact === '') return null;
  if (!AMOUNT.test(compact)) return Number.NaN;
  const [whole, fraction = ''] = compact.split(/[.,]/);
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

/** "€12.50" / "12,50 €": whole euros without decimals. */
export function formatEuros(cents: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/** The value to put back into an amount field: "12.50" in English, "12,50" in Latvian and Russian. */
export function centsToInput(cents: number | null, locale: string): string {
  if (cents === null || !Number.isFinite(cents)) return '';
  const whole = Math.trunc(cents / 100);
  const rest = cents % 100;
  if (rest === 0) return String(whole);
  const separator = locale === 'en' ? '.' : ',';
  return `${whole}${separator}${String(rest).padStart(2, '0')}`;
}
