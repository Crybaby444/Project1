import type { Locale } from '@yoyo/shared';
import { CONTACT_EMAIL } from '@/lib/site';

/**
 * Who runs Yoyo. The owner fills in the legal details (name or company, registration number, address);
 * until then the texts say "the operator of Yoyo, based in Latvia" and give the contact address.
 */
export const OPERATOR = {
  brand: 'Yoyo',
  country: 'Latvia',
  email: CONTACT_EMAIL,
  legalName: null as string | null,
  registrationNumber: null as string | null,
  address: null as string | null,
};

const FALLBACK: Record<Locale, string> = {
  en: 'the operator of Yoyo, based in Latvia',
  lv: 'Yoyo uzturētājs Latvijā',
  ru: 'оператор Yoyo в Латвии',
};

const REGISTRATION: Record<Locale, string> = { en: 'registration No.', lv: 'reģ. Nr.', ru: 'рег. №' };

/** The operator as a noun phrase for the texts, in `locale`. */
export function describeOperator(locale: Locale, operator = OPERATOR): string {
  if (!operator.legalName) return FALLBACK[locale];
  return [
    operator.legalName,
    operator.registrationNumber && `${REGISTRATION[locale]} ${operator.registrationNumber}`,
    operator.address,
  ]
    .filter(Boolean)
    .join(', ');
}
