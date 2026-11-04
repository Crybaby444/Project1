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
