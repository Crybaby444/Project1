import { IbanSchema } from './iban';
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
  'BOOKING_PARTIAL_REFUND',
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
  /** The title of the deal's item, for the link to the deal. */
  listingTitle: z.string().nullable(),
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
/** A test-card token (`tok_…`) or, with Stripe, a PaymentMethod from Stripe's own form (`pm_…`). */
export const CardTokenFieldSchema = z.string().min(10).max(1000).regex(/^(tok|pm)_[A-Za-z0-9_.-]+$/, 'Not a card token');

/** Bounds of wallet movements, in cents. */
export const WALLET_LIMITS = {
  topUp: { min: 100, max: 50_000 },
  payout: { min: 100, max: 500_000 },
  /** A wallet never holds more than this after a top-up. */
  balance: 500_000,
} as const;

export const WalletSummarySchema = z.object({
  /** What the user can spend or withdraw. */
  balanceCents: z.number().int(),
  /** Rent and deposits the user paid from the wallet that Yoyo still holds for open deals. */
  heldCents: z.number().int(),
  /** Deposits of the user's open rentals Yoyo keeps frozen, however they were paid. */
  depositsCents: z.number().int(),
  /** Rent of the user's own items Yoyo holds until the renter confirms the handover. */
  incomingCents: z.number().int(),
  /** Everything the user's items earned into the wallet: rent and deposits kept for damage. */
  earnedCents: z.number().int(),
});

export type WalletSummary = z.infer<typeof WalletSummarySchema>;

export const WalletTransactionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).optional(),
  kind: z.enum(LEDGER_KINDS).optional(),
});

export const WalletTransactionsResponseSchema = z.object({
  items: z.array(WalletTransactionSchema),
  total: z.number().int(),
});

export type WalletTransactionsResponse = z.infer<typeof WalletTransactionsResponseSchema>;

export const TopUpRequestSchema = z.object({
  amountCents: z.number().int().min(WALLET_LIMITS.topUp.min).max(WALLET_LIMITS.topUp.max),
  cardToken: CardTokenFieldSchema,
});

/**
 * A payout goes to a bank account (owner, 2026-11-16: IBAN and the holder's name, a SEPA transfer in
 * euros) or, as before, to a card: exactly one of the two.
 */
export const PayoutRequestSchema = z
  .object({
    amountCents: z.number().int().min(WALLET_LIMITS.payout.min).max(WALLET_LIMITS.payout.max),
    cardToken: CardTokenFieldSchema.optional(),
    iban: IbanSchema.optional(),
    /** The account holder's name, as the bank has it. */
    holder: z.string().trim().min(2).max(70).optional(),
  })
  .superRefine((body, ctx) => {
    if ((body.cardToken === undefined) === (body.iban === undefined)) {
      ctx.addIssue({ code: 'custom', path: ['iban'], message: 'Give a bank account or a card' });
    }
    if (body.iban !== undefined && body.holder === undefined) {
      ctx.addIssue({ code: 'custom', path: ['holder'], message: 'Required' });
    }
  });

/** Apple Pay and Google Pay give a card token from the phone's wallet, like a typed card (owner, 2026-11-16). */
export const WALLET_PAY_KINDS = ['apple_pay', 'google_pay'] as const;
export type WalletPayKind = (typeof WALLET_PAY_KINDS)[number];
export const WalletPayTokenRequestSchema = z.object({ kind: z.enum(WALLET_PAY_KINDS) });

export const CardPaymentSchema = z.object({
  id: z.string(),
  amountCents: z.number().int(),
  brand: z.string(),
  last4: z.string(),
});

export const TopUpResponseSchema = z.object({ balanceCents: z.number().int(), payment: CardPaymentSchema });

export type TopUpResponse = z.infer<typeof TopUpResponseSchema>;

export const MONEY_JOB_STATUSES = ['PENDING', 'DONE', 'FAILED'] as const;

export const PayoutResponseSchema = z.object({
  balanceCents: z.number().int(),
  payout: CardPaymentSchema.extend({ status: z.enum(MONEY_JOB_STATUSES) }),
});

export type PayoutResponse = z.infer<typeof PayoutResponseSchema>;
