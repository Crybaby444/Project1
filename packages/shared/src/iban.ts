import { z } from 'zod';
import { isCountry } from './countries';

/** Spaces out, upper case: how an IBAN is stored and checked. */
export function normalizeIban(text: string): string {
  return text.replace(/\s+/g, '').toUpperCase();
}

/** ISO 13616: move the first four characters to the end, letters to numbers, the rest modulo 97 is 1. */
function checksumOk(iban: string): boolean {
  const moved = iban.slice(4) + iban.slice(0, 4);
  let rest = 0;
  for (const ch of moved) {
    const value = /[A-Z]/.test(ch) ? String(ch.charCodeAt(0) - 55) : ch;
    for (const digit of value) rest = (rest * 10 + Number(digit)) % 97;
  }
  return rest === 1;
}

/**
 * A bank account to pay out to (owner, 2026-11-16: money goes out to a bank account): a valid IBAN of a
 * euro-area country, so the payout is a plain SEPA transfer in euros.
 */
export const IbanSchema = z
  .string()
  .max(42)
  .transform(normalizeIban)
  .refine((iban) => /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban) && checksumOk(iban), 'This IBAN is not valid')
  .refine((iban) => isCountry(iban.slice(0, 2)), 'Payouts go to accounts in euro-area countries');

/** For receipts and lists: the country and the last four, nothing in between. */
export function maskIban(iban: string): string {
  return `${iban.slice(0, 2)} •••• ${iban.slice(-4)}`;
}
