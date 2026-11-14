/**
 * A score as the language writes it: "4.5" in English, "4,5" in Latvian and Russian. `fixed` keeps one
 * decimal ("4,0") for a shown average; otherwise whole scores stay whole ("4 of 5").
 */
export function formatScore(value: number, locale: string, fixed = false): string {
  return new Intl.NumberFormat(locale, { minimumFractionDigits: fixed ? 1 : 0, maximumFractionDigits: 1 }).format(value);
}
