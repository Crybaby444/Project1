import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { CardBrand, CardInput, CardToken } from '@yoyo/shared';
import type { Clock } from '../clock/clock';
import { AppError } from '../common/app-error';
import type { ChargeResult, PaymentProvider } from './payment.provider';

/** How long a card token can be used to pay. */
const TOKEN_TTL_MS = 15 * 60_000;

type Outcome = 'ok' | 'card_declined' | 'insufficient_funds' | 'expired_card' | 'processing_error';

/** Stripe's well-known test numbers that fail, and how. Every other valid number succeeds. */
const DECLINING: Record<string, Outcome> = {
  '4000000000000002': 'card_declined',
  '4000000000009995': 'insufficient_funds',
  '4000000000000069': 'expired_card',
  '4000000000000119': 'processing_error',
};

interface TokenPayload {
  b: CardBrand;
  l: string;
  m: number;
  y: number;
  o: Outcome;
  /** Until when it can be used to pay (ms since epoch). */
  e: number;
  n: string;
}

function luhn(digits: string): boolean {
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

function brandOf(digits: string): CardBrand | null {
  if (/^4\d{15}$/.test(digits)) return 'visa';
  if (/^(5[1-5]\d{14}|2(2[2-9]\d|[3-6]\d\d|7[01]\d|720)\d{12})$/.test(digits)) return 'mastercard';
  if (/^3[47]\d{13}$/.test(digits)) return 'amex';
  return null;
}

const newRef = (prefix: string) => `${prefix}_${randomBytes(12).toString('base64url')}`;

/**
 * A card provider that behaves like a real one without moving real money (spec §0, §4.4: some test
 * numbers pass, others are declined). Checks the number (Luhn, brand), expiry and CVC like a card form,
 * signs tokens that carry only the brand, last 4 digits and the test outcome (never the number), and
 * remembers idempotency keys while the process lives, as a provider's API does.
 */
export class FakeCardProvider implements PaymentProvider {
  private readonly key: Buffer;
  private readonly seen = new Map<string, unknown>();

  constructor(
    secret: string,
    private readonly clock: Clock,
  ) {
    this.key = createHmac('sha256', secret).update('yoyo:payments:fake-card').digest();
  }

  tokenize(card: CardInput): CardToken {
    const digits = card.number.replace(/[ -]/g, '');
    const fields: Record<string, string> = {};
    const brand = brandOf(digits);
    if (brand === null || !luhn(digits)) fields['number'] = 'This card number is not valid';
    const now = this.clock.now();
    const thisMonth = now.getUTCFullYear() * 12 + now.getUTCMonth();
    if (card.expYear * 12 + (card.expMonth - 1) < thisMonth) fields['expYear'] = 'This card has expired';
    if (brand !== null && card.cvc.length !== (brand === 'amex' ? 4 : 3)) {
      fields['cvc'] = brand === 'amex' ? 'Four digits on the front of the card' : 'Three digits on the back of the card';
    }
    if (Object.keys(fields).length > 0 || brand === null) throw new AppError('VALIDATION_FAILED', 400, 'Check the card details', fields);

    const payload: TokenPayload = {
      b: brand,
      l: digits.slice(-4),
      m: card.expMonth,
      y: card.expYear,
      o: DECLINING[digits] ?? 'ok',
      e: now.getTime() + TOKEN_TTL_MS,
      n: randomBytes(6).toString('base64url'),
    };
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return { token: `tok_${body}.${this.sign(body)}`, brand, last4: payload.l, expMonth: card.expMonth, expYear: card.expYear };
  }

  async charge(input: { token: string; amountCents: number; idempotencyKey: string; description: string }): Promise<ChargeResult> {
    return this.once(`charge:${input.idempotencyKey}`, () => {
      const card = this.read(input.token, true);
      if (card === null) return { status: 'DECLINED', declineCode: 'invalid_token' };
      if (card.o !== 'ok') return { status: 'DECLINED', declineCode: card.o };
      return { status: 'SUCCEEDED', ref: newRef('ch'), brand: card.b, last4: card.l };
    });
  }

  async refund(input: { paymentRef: string; amountCents: number; idempotencyKey: string }): Promise<{ ref: string }> {
    return this.once(`refund:${input.idempotencyKey}`, () => ({ ref: newRef('re') }));
  }

  async payout(input: { token: string; amountCents: number; idempotencyKey: string }): Promise<{ ref: string }> {
    return this.once(`payout:${input.idempotencyKey}`, () => {
      // A saved destination keeps working after the 15 minutes a token has to pay.
      if (this.read(input.token, false) === null) throw new Error('payout to an unknown card');
      return { ref: newRef('po') };
    });
  }

  describe(token: string): { brand: CardBrand; last4: string } | null {
    const card = this.read(token, false);
    return card === null ? null : { brand: card.b, last4: card.l };
  }

  private once<T>(key: string, run: () => T): T {
    if (this.seen.has(key)) return this.seen.get(key) as T;
    const result = run();
    this.seen.set(key, result);
    return result;
  }

  private sign(body: string): string {
    return createHmac('sha256', this.key).update(body).digest('base64url');
  }

  /** The token's payload if we signed it (and, when `fresh`, it has not run out), else null. */
  private read(token: string, fresh: boolean): TokenPayload | null {
    const match = /^tok_([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(token);
    if (!match) return null;
    const [, body, signature] = match as unknown as [string, string, string];
    const expected = Buffer.from(this.sign(body));
    const given = Buffer.from(signature);
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
    try {
      const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as TokenPayload;
      if (fresh && payload.e < this.clock.now().getTime()) return null;
      return payload;
    } catch {
      return null;
    }
  }
}
