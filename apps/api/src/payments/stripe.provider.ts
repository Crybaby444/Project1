import { createHmac, timingSafeEqual } from 'node:crypto';
import { Logger } from '@nestjs/common';
import type { CardBrand, CardInput, CardToken, WalletPayKind } from '@yoyo/shared';
import { AppError } from '../common/app-error';
import type { ChargeResult, PaymentProvider } from './payment.provider';

/**
 * Stripe behind the same PaymentProvider as the test cards (owner, 2026-11-16: payments finished and
 * ready, switched on later). Switched on with PAYMENTS=stripe and STRIPE_SECRET_KEY.
 *
 * - Card details never reach Yoyo: the site's card form is Stripe's own (Stripe.js), which hands over a
 *   PaymentMethod id (`pm_…`); that id is the "card token" here. Apple Pay / Google Pay come the same way.
 * - charge: a PaymentIntent in euros, confirmed at once, with Yoyo's idempotency key. A card that needs
 *   3-D Secure answers DECLINED `authentication_required` until the site's confirm step handles it.
 * - payout: a Connect transfer to the owner's connected account (`acct_…`); bank details live in Stripe.
 * - The money the platform holds is Stripe's (Connect), never a Yoyo balance (audit 2026-11-16, M1).
 */
const BRANDS: Record<string, CardBrand> = { visa: 'visa', mastercard: 'mastercard', amex: 'amex' };

interface StripeError {
  error?: { type?: string; code?: string; decline_code?: string; message?: string };
}

export class StripePaymentProvider implements PaymentProvider {
  private readonly logger = new Logger('Stripe');
  private readonly apiUrl: string;
  /** What a PaymentMethod is, learnt when it pays: receipts name the card without another call. */
  private readonly cards = new Map<string, { brand: CardBrand; last4: string }>();

  constructor(private readonly options: { secretKey: string; apiUrl?: string }) {
    this.apiUrl = (options.apiUrl ?? 'https://api.stripe.com').replace(/\/$/, '');
  }

  tokenize(_card: CardInput): CardToken {
    throw new AppError('ACTION_NOT_ALLOWED', 400, 'Cards are entered in Stripe’s own form, never sent to Yoyo', undefined, { why: 'STRIPE_ELEMENTS' });
  }

  tokenizeWallet(_kind: WalletPayKind): CardToken {
    throw new AppError('ACTION_NOT_ALLOWED', 400, 'Apple Pay and Google Pay go through Stripe’s own button', undefined, { why: 'STRIPE_ELEMENTS' });
  }

  private async call<T>(path: string, form: Record<string, string>, idempotencyKey: string): Promise<{ status: number; json: T & StripeError }> {
    const res = await fetch(`${this.apiUrl}${path}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.options.secretKey}`,
        'content-type': 'application/x-www-form-urlencoded',
        'idempotency-key': idempotencyKey,
        'stripe-version': '2024-06-20',
      },
      body: new URLSearchParams(form),
      signal: AbortSignal.timeout(20_000),
    });
    return { status: res.status, json: (await res.json()) as T & StripeError };
  }

  async charge(input: { token: string; amountCents: number; idempotencyKey: string; description: string }): Promise<ChargeResult> {
    // After 3-D Secure the site pays again with the confirmed PaymentIntent itself: check it, charge nothing new.
    if (input.token.startsWith('pi_')) return this.confirmed(input.token, input.amountCents);
    const { status, json } = await this.call<{ id: string; status: string; client_secret?: string; payment_method?: { id: string; card?: { brand: string; last4: string } } }>(
      '/v1/payment_intents',
      {
        amount: String(input.amountCents),
        currency: 'eur',
        payment_method: input.token,
        confirm: 'true',
        description: input.description,
        'automatic_payment_methods[enabled]': 'true',
        'automatic_payment_methods[allow_redirects]': 'never',
        'expand[]': 'payment_method',
      },
      input.idempotencyKey,
    );
    if (status === 402 || json.error?.type === 'card_error') {
      return { status: 'DECLINED', declineCode: json.error?.decline_code ?? json.error?.code ?? 'card_declined' };
    }
    if (status >= 400 || json.error) {
      this.logger.error(`charge failed: ${status} ${json.error?.message ?? ''}`);
      throw new AppError('INTERNAL', 502, 'The payment provider did not answer as expected');
    }
    if (json.status === 'requires_action') {
      return { status: 'DECLINED', declineCode: 'authentication_required', ...(json.client_secret && { clientSecret: json.client_secret }), paymentIntent: json.id };
    }
    if (json.status !== 'succeeded') return { status: 'DECLINED', declineCode: json.status };
    const card = json.payment_method?.card;
    const described = { brand: BRANDS[card?.brand ?? ''] ?? ('visa' as CardBrand), last4: card?.last4 ?? '0000' };
    this.cards.set(input.token, described);
    return { status: 'SUCCEEDED', ref: json.id, ...described };
  }

  /** A PaymentIntent the bank confirmed in the browser: it must have succeeded, in euros, for this amount. */
  private async confirmed(id: string, amountCents: number): Promise<ChargeResult> {
    const res = await fetch(`${this.apiUrl}/v1/payment_intents/${encodeURIComponent(id)}?expand[]=payment_method`, {
      headers: { authorization: `Bearer ${this.options.secretKey}`, 'stripe-version': '2024-06-20' },
      signal: AbortSignal.timeout(20_000),
    });
    const json = (await res.json()) as { id?: string; status?: string; amount?: number; currency?: string; payment_method?: { id: string; card?: { brand: string; last4: string } } } & StripeError;
    if (!res.ok || json.error || json.id !== id) return { status: 'DECLINED', declineCode: 'invalid_token' };
    if (json.status !== 'succeeded') return { status: 'DECLINED', declineCode: json.status === 'requires_payment_method' ? 'authentication_failed' : (json.status ?? 'card_declined') };
    if (json.amount !== amountCents || json.currency !== 'eur') return { status: 'DECLINED', declineCode: 'amount_mismatch' };
    const card = json.payment_method?.card;
    return { status: 'SUCCEEDED', ref: id, brand: BRANDS[card?.brand ?? ''] ?? ('visa' as CardBrand), last4: card?.last4 ?? '0000' };
  }

  async refund(input: { paymentRef: string; amountCents: number; idempotencyKey: string }): Promise<{ ref: string }> {
    const { status, json } = await this.call<{ id: string }>('/v1/refunds', { payment_intent: input.paymentRef, amount: String(input.amountCents) }, input.idempotencyKey);
    if (status >= 400 || json.error) throw new AppError('INTERNAL', 502, `The refund did not go through: ${json.error?.message ?? status}`);
    return { ref: json.id };
  }

  async payout(input: { token: string; amountCents: number; idempotencyKey: string }): Promise<{ ref: string }> {
    if (!input.token.startsWith('acct_')) {
      throw new AppError('ACTION_NOT_ALLOWED', 400, 'With Stripe, money goes to the owner’s Stripe account', undefined, { why: 'STRIPE_CONNECT_REQUIRED' });
    }
    const { status, json } = await this.call<{ id: string }>('/v1/transfers', { amount: String(input.amountCents), currency: 'eur', destination: input.token }, input.idempotencyKey);
    if (status >= 400 || json.error) throw new AppError('INTERNAL', 502, `The transfer did not go through: ${json.error?.message ?? status}`);
    return { ref: json.id };
  }

  /** A Connect Express account for an owner, in their country, able to receive transfers. */
  async createAccount(input: { email: string; country: string; userId: string }): Promise<string> {
    const { status, json } = await this.call<{ id: string }>(
      '/v1/accounts',
      { type: 'express', country: input.country, email: input.email, 'capabilities[transfers][requested]': 'true', 'metadata[yoyo_user]': input.userId },
      `account-${input.userId}`,
    );
    if (status >= 400 || json.error) throw new AppError('INTERNAL', 502, `Stripe did not create the account: ${json.error?.message ?? status}`);
    return json.id;
  }

  /** Stripe's own onboarding page for that account (identity, bank account), coming back to `returnUrl`. */
  async onboardingLink(account: string, returnUrl: string, refreshUrl: string): Promise<string> {
    const { status, json } = await this.call<{ url: string }>(
      '/v1/account_links',
      { account, return_url: returnUrl, refresh_url: refreshUrl, type: 'account_onboarding' },
      `link-${account}-${Date.now()}`,
    );
    if (status >= 400 || json.error) throw new AppError('INTERNAL', 502, `Stripe did not open onboarding: ${json.error?.message ?? status}`);
    return json.url;
  }

  describe(token: string): { brand: CardBrand; last4: string } | null {
    return this.cards.get(token) ?? null;
  }
}

/**
 * Stripe-Signature check for webhooks: `t=<seconds>,v1=<hex HMAC-SHA256 of "t.payload">`, within five
 * minutes of now, compared in constant time.
 */
export function verifyStripeSignature(payload: string, header: string | undefined, secret: string, now: Date): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=') as [string, string]));
  const t = Number(parts['t']);
  const v1 = parts['v1'];
  if (!Number.isFinite(t) || !v1 || Math.abs(now.getTime() / 1000 - t) > 300) return false;
  const expected = createHmac('sha256', secret).update(`${t}.${payload}`).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(v1);
  return a.length === b.length && timingSafeEqual(a, b);
}
