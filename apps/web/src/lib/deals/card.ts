import type { ApiClient } from '@yoyo/api-client';
import type { CardBrand, CardToken } from '@yoyo/shared';
import { unwrap } from '@/lib/session/api-error';

/**
 * The card form's rules, the same as the payment provider's (plan 8, FakeCardProvider): Luhn, the brand
 * from the number, an expiry not in the past, 3 digits of CVC (4 for American Express), a name.
 */

export const digitsOf = (text: string) => text.replace(/\D/g, '');

export function luhn(number: string): boolean {
  const digits = digitsOf(number);
  if (digits.length < 12 || digits.length > 19) return false;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

export function brandOf(number: string): CardBrand | null {
  const d = digitsOf(number);
  if (/^4/.test(d)) return 'visa';
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(d)) return 'mastercard';
  if (/^3[47]/.test(d)) return 'amex';
  return null;
}

/** "4242 4242 4242 4242", American Express as "3782 822463 10005"; at most 19 digits. */
export function formatCardNumber(text: string): string {
  const d = digitsOf(text).slice(0, 19);
  if (brandOf(d) === 'amex') return [d.slice(0, 4), d.slice(4, 10), d.slice(10, 15)].filter(Boolean).join(' ');
  return d.replace(/(\d{4})(?=\d)/g, '$1 ');
}

/** "MM / YY" as it is typed: the slash comes by itself after the month. */
export function formatExpiry(text: string): string {
  const d = digitsOf(text).slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)} / ${d.slice(2)}` : d;
}

export function parseExpiry(text: string): { month: number; year: number } | null {
  const d = digitsOf(text);
  if (d.length !== 4) return null;
  const month = Number(d.slice(0, 2));
  if (month < 1 || month > 12) return null;
  return { month, year: 2000 + Number(d.slice(2)) };
}

export type CardFields = { number: string; expiry: string; cvc: string; holder: string };
export type CardProblem = Partial<Record<keyof CardFields, 'number' | 'expiry' | 'cvc' | 'holder'>>;

export function checkCard(fields: CardFields, now: Date = new Date()): CardProblem {
  const problems: CardProblem = {};
  const brand = brandOf(fields.number);
  if (!luhn(fields.number) || brand === null) problems.number = 'number';
  const expiry = parseExpiry(fields.expiry);
  const thisMonth = now.getUTCFullYear() * 12 + now.getUTCMonth() + 1;
  if (!expiry || expiry.year * 12 + expiry.month < thisMonth) problems.expiry = 'expiry';
  if (!(brand === 'amex' ? /^\d{4}$/ : /^\d{3}$/).test(fields.cvc)) problems.cvc = 'cvc';
  const holder = fields.holder.trim();
  if (holder.length < 2 || holder.length > 100) problems.holder = 'holder';
  return problems;
}

/** The provider's test numbers (as Stripe's), shown on the form in test mode. */
export const TEST_CARDS = [
  { key: 'visa', number: '4242 4242 4242 4242' },
  { key: 'mastercard', number: '5555 5555 5555 4444' },
  { key: 'declined', number: '4000 0000 0000 0002' },
  { key: 'insufficient', number: '4000 0000 0000 9995' },
  { key: 'expired', number: '4000 0000 0000 0069' },
] as const;

/**
 * The one place a card number leaves the browser: to the payment provider, which answers a token
 * (and the brand and last 4 digits to show). With the test provider that is the API's tokenizer; with
 * Stripe it becomes Stripe.js, and nothing else on the site changes.
 */
export async function tokenizeCard(client: ApiClient, fields: CardFields): Promise<CardToken> {
  const expiry = parseExpiry(fields.expiry)!;
  return unwrap(
    client.POST('/api/v1/payments/card-tokens', {
      body: {
        number: digitsOf(fields.number),
        expMonth: expiry.month,
        expYear: expiry.year,
        cvc: fields.cvc,
        holder: fields.holder.trim(),
      },
    }),
  );
}
