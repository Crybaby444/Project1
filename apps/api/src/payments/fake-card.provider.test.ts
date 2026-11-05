import { describe, expect, it } from 'vitest';
import { FakeClock } from '../../test/support/fake-clock';
import { AppError } from '../common/app-error';
import { FakeCardProvider } from './fake-card.provider';

const clock = new FakeClock(new Date('2026-11-05T12:00:00Z'));
const provider = new FakeCardProvider('test-secret-test-secret-test-secret', clock);
const card = (number: string, extra: Partial<{ expMonth: number; expYear: number; cvc: string }> = {}) => ({
  number,
  expMonth: 12,
  expYear: 2030,
  cvc: '123',
  holder: 'Anna Bērziņa',
  ...extra,
});

function fieldsOf(fn: () => unknown): Record<string, string> | undefined {
  try {
    fn();
  } catch (error) {
    if (error instanceof AppError) return error.fields;
    throw error;
  }
  throw new Error('expected an AppError');
}

describe('FakeCardProvider.tokenize', () => {
  it('knows the brand and keeps only the last four digits', () => {
    const visa = provider.tokenize(card('4242 4242 4242 4242'));
    expect(visa).toMatchObject({ brand: 'visa', last4: '4242', expMonth: 12, expYear: 2030 });
    expect(visa.token).toMatch(/^tok_/);
    expect(visa.token).not.toContain('4242424242424242');
    expect(Buffer.from(visa.token.slice(4).split('.')[0]!, 'base64url').toString()).not.toContain('424242424242');
    expect(provider.tokenize(card('5555555555554444')).brand).toBe('mastercard');
    expect(provider.tokenize(card('378282246310005', { cvc: '1234' })).brand).toBe('amex');
  });

  it('checks the number (Luhn), the expiry and the CVC', () => {
    expect(fieldsOf(() => provider.tokenize(card('4242424242424241')))).toEqual({ number: expect.any(String) });
    expect(fieldsOf(() => provider.tokenize(card('4242424242424242', { expMonth: 10, expYear: 2026 })))).toEqual({
      expYear: expect.any(String),
    });
    expect(fieldsOf(() => provider.tokenize(card('4242424242424242', { cvc: '12' })))).toEqual({ cvc: expect.any(String) });
    expect(fieldsOf(() => provider.tokenize(card('378282246310005', { cvc: '123' })))).toEqual({ cvc: expect.any(String) });
  });

  it('accepts a card that expires at the end of this month', () => {
    expect(provider.tokenize(card('4242424242424242', { expMonth: 11, expYear: 2026 })).last4).toBe('4242');
  });
});

describe('FakeCardProvider.charge', () => {
  const charge = (number: string, key = crypto.randomUUID()) =>
    provider.charge({ token: provider.tokenize(card(number)).token, amountCents: 1500, idempotencyKey: key, description: 'test' });

  it('takes money from the good test cards', async () => {
    expect(await charge('4242424242424242')).toMatchObject({ status: 'SUCCEEDED', brand: 'visa', last4: '4242', ref: expect.stringMatching(/^ch_/) });
    expect(await charge('5555555555554444')).toMatchObject({ status: 'SUCCEEDED' });
  });

  it('declines the decline test cards with their codes', async () => {
    expect(await charge('4000000000000002')).toEqual({ status: 'DECLINED', declineCode: 'card_declined' });
    expect(await charge('4000000000009995')).toEqual({ status: 'DECLINED', declineCode: 'insufficient_funds' });
    expect(await charge('4000000000000069')).toEqual({ status: 'DECLINED', declineCode: 'expired_card' });
    expect(await charge('4000000000000119')).toEqual({ status: 'DECLINED', declineCode: 'processing_error' });
  });

  it('declines a forged or expired token', async () => {
    const { token } = provider.tokenize(card('4000000000000002'));
    const [payload, signature] = token.slice(4).split('.') as [string, string];
    const forgedPayload = Buffer.from(Buffer.from(payload, 'base64url').toString().replace('card_declined', 'ok')).toString('base64url');
    const forged = `tok_${forgedPayload}.${signature}`;
    expect(await provider.charge({ token: forged, amountCents: 100, idempotencyKey: 'f', description: 'x' })).toEqual({
      status: 'DECLINED',
      declineCode: 'invalid_token',
    });
    const late = new FakeCardProvider('test-secret-test-secret-test-secret', new FakeClock(new Date('2026-11-05T12:16:00Z')));
    const old = provider.tokenize(card('4242424242424242')).token;
    expect(await late.charge({ token: old, amountCents: 100, idempotencyKey: 'g', description: 'x' })).toEqual({
      status: 'DECLINED',
      declineCode: 'invalid_token',
    });
  });

  it('answers a repeated charge with the same key with the same result', async () => {
    const key = crypto.randomUUID();
    const first = await charge('4242424242424242', key);
    const again = await charge('4242424242424242', key);
    expect(again).toEqual(first);
  });

  it('refunds and pays out with references of their own', async () => {
    const done = await charge('4242424242424242');
    if (done.status !== 'SUCCEEDED') throw new Error('charge failed');
    expect(await provider.refund({ paymentRef: done.ref, amountCents: 500, idempotencyKey: 'r1' })).toEqual({ ref: expect.stringMatching(/^re_/) });
    const { token } = provider.tokenize(card('4242424242424242'));
    expect(await provider.payout({ token, amountCents: 500, idempotencyKey: 'p1' })).toEqual({ ref: expect.stringMatching(/^po_/) });
  });
});
