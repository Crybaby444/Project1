import { z } from 'zod';

/** Kinds of ledger operations (OperationKind of @yoyo/domain). */
export const LEDGER_KINDS = [
  'TOP_UP',
  'WITHDRAWAL',
  'BOOKING_PAYMENT',
  'RENT_RELEASE',
  'DEPOSIT_REFUND',
  'DEPOSIT_TO_OWNER',
  'BOOKING_REFUND',
] as const;

export type LedgerKind = (typeof LEDGER_KINDS)[number];

/** Wallet history entries per page. */
export const WALLET_PAGE_SIZE = 20;

/** One movement of the user's wallet: + in, − out, in whole cents. */
export const WalletTransactionSchema = z.object({
  id: z.string(),
  kind: z.enum(LEDGER_KINDS),
  amountCents: z.number().int(),
  bookingId: z.string().nullable(),
  createdAt: z.iso.datetime(),
});

export type WalletTransaction = z.infer<typeof WalletTransactionSchema>;

/**
 * Card details as the payment form sends them. With the test provider they go to the API's tokenizer;
 * with a real provider (Stripe) the browser sends them to the provider and the API only sees the token.
 */
export const CardInputSchema = z.object({
  /** Digits, spaces and dashes allowed. */
  number: z.string().max(40).regex(/^[\d -]+$/, 'Only digits'),
  expMonth: z.number().int().min(1).max(12),
  expYear: z.number().int().min(2000).max(2100),
  cvc: z.string().regex(/^\d{3,4}$/, '3 or 4 digits'),
  holder: z.string().trim().min(2).max(100),
});

export type CardInput = z.infer<typeof CardInputSchema>;

export const CARD_BRANDS = ['visa', 'mastercard', 'amex'] as const;

export type CardBrand = (typeof CARD_BRANDS)[number];

/** A card the provider knows: what to show ("Visa ·· 4242") and the token to pay with. */
export const CardTokenSchema = z.object({
  token: z.string(),
  brand: z.enum(CARD_BRANDS),
  last4: z.string().regex(/^\d{4}$/),
  expMonth: z.number().int(),
  expYear: z.number().int(),
});

export type CardToken = z.infer<typeof CardTokenSchema>;

/** A card token from POST /payments/card-tokens; it works for 15 minutes. */
export const CardTokenFieldSchema = z.string().min(10).max(1000).regex(/^tok_[A-Za-z0-9_.-]+$/, 'Not a card token');
