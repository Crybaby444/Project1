import type { CardBrand, CardInput, CardToken } from '@yoyo/shared';

export type ChargeResult =
  | { status: 'SUCCEEDED'; ref: string; brand: CardBrand; last4: string }
  | { status: 'DECLINED'; declineCode: string };

/**
 * Where money comes from and goes to outside Yoyo (spec §0): today the test card provider, later a real
 * one (Stripe Connect) behind the same interface. Every call that moves money takes an idempotency key:
 * repeating it with the same key never moves the money twice.
 */
export interface PaymentProvider {
  /** Card details → a token. Invalid details: AppError VALIDATION_FAILED with `fields`. */
  tokenize(card: CardInput): CardToken;
  charge(input: { token: string; amountCents: number; idempotencyKey: string; description: string }): Promise<ChargeResult>;
  /** Gives back (part of) a charge to the card it came from. */
  refund(input: { paymentRef: string; amountCents: number; idempotencyKey: string }): Promise<{ ref: string }>;
  /** Sends money to a card. */
  payout(input: { token: string; amountCents: number; idempotencyKey: string }): Promise<{ ref: string }>;
  /** The brand and last digits of a token, for receipts; null when the token is not one of ours. */
  describe(token: string): { brand: CardBrand; last4: string } | null;
}

/** Injection token for the PaymentProvider. */
export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');
