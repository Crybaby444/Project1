import { createHmac } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cents, topUp as topUpOperation } from '@yoyo/domain';
import { LedgerService } from '../src/ledger/ledger.service';
import { resetAccounts, resetDeals } from './support/db';
import { requestBooking, step } from './support/deals';
import { seedListing, signedInClient } from './support/listings';
import { createTestApp } from './support/test-app';
import { StripePaymentProvider, verifyStripeSignature } from '../src/payments/stripe.provider';
import { startFakeStripe, type FakeStripe } from './support/fake-stripe';

describe('Stripe payment provider (ready, off until PAYMENTS=stripe)', () => {
  let stripe: FakeStripe;
  let provider: StripePaymentProvider;

  beforeAll(async () => {
    stripe = await startFakeStripe();
    provider = new StripePaymentProvider({ secretKey: stripe.key, apiUrl: stripe.url });
  });
  afterAll(async () => {
    await stripe.close();
  });

  it('charges in euros with the idempotency key, and tells brand and last digits', async () => {
    const result = await provider.charge({ token: 'pm_card_visa', amountCents: 4500, idempotencyKey: 'deal-1-pay', description: 'Yoyo deal' });
    expect(result).toEqual({ status: 'SUCCEEDED', ref: expect.stringMatching(/^pi_/), brand: 'visa', last4: '4242' });
    const call = stripe.calls.at(-1)!;
    expect(call.path).toBe('/v1/payment_intents');
    expect(Object.fromEntries(call.form)).toMatchObject({ amount: '4500', currency: 'eur', payment_method: 'pm_card_visa', confirm: 'true' });
    expect(call.idempotencyKey).toBe('deal-1-pay');
    expect(provider.describe('pm_card_visa')).toEqual({ brand: 'visa', last4: '4242' });
    // The same key twice moves the money once.
    const again = await provider.charge({ token: 'pm_card_visa', amountCents: 4500, idempotencyKey: 'deal-1-pay', description: 'Yoyo deal' });
    expect(again).toEqual(result);
  });

  it('answers a declined card and a card that needs 3-D Secure as declined, with Stripe’s code', async () => {
    expect(await provider.charge({ token: 'pm_card_chargeDeclined', amountCents: 100, idempotencyKey: 'k2', description: 'x' })).toEqual({ status: 'DECLINED', declineCode: 'generic_decline' });
    const needs = await provider.charge({ token: 'pm_card_authenticationRequired', amountCents: 100, idempotencyKey: 'k3', description: 'x' });
    expect(needs).toEqual({ status: 'DECLINED', declineCode: 'authentication_required', clientSecret: expect.stringMatching(/_secret$/), paymentIntent: expect.stringMatching(/^pi_/) });
  });

  it('refunds part of a charge, and pays an owner’s Connect account', async () => {
    expect(await provider.refund({ paymentRef: 'pi_1', amountCents: 1500, idempotencyKey: 'r1' })).toEqual({ ref: expect.stringMatching(/^re_/) });
    expect(Object.fromEntries(stripe.calls.at(-1)!.form)).toMatchObject({ payment_intent: 'pi_1', amount: '1500' });
    expect(await provider.payout({ token: 'acct_123ABC', amountCents: 3000, idempotencyKey: 'p1' })).toEqual({ ref: expect.stringMatching(/^tr_/) });
    expect(Object.fromEntries(stripe.calls.at(-1)!.form)).toMatchObject({ destination: 'acct_123ABC', amount: '3000', currency: 'eur' });
    await expect(provider.payout({ token: 'iban:LV80BANK0000435195001|Anna', amountCents: 3000, idempotencyKey: 'p2' })).rejects.toThrow();
  });

  it('never takes card numbers itself: cards are entered in Stripe’s own form', () => {
    expect(() => provider.tokenize({ number: '4242424242424242', expMonth: 12, expYear: 2030, cvc: '123', holder: 'Anna Test' })).toThrow();
  });

  it('accepts only webhooks Stripe signed, within five minutes', () => {
    const secret = 'whsec_test';
    const payload = '{"id":"evt_1","type":"payment_intent.succeeded"}';
    const t = Math.floor(Date.now() / 1000);
    const v1 = createHmac('sha256', secret).update(`${t}.${payload}`).digest('hex');
    expect(verifyStripeSignature(payload, `t=${t},v1=${v1}`, secret, new Date())).toBe(true);
    expect(verifyStripeSignature(payload, `t=${t},v1=${'0'.repeat(64)}`, secret, new Date())).toBe(false);
    expect(verifyStripeSignature(payload, `t=${t - 600},v1=${createHmac('sha256', secret).update(`${t - 600}.${payload}`).digest('hex')}`, secret, new Date())).toBe(false);
  });

  it('the webhook route answers only Stripe-signed events, and is off without the secret', async () => {
    const t = await createTestApp({ env: { STRIPE_WEBHOOK_SECRET: 'whsec_route' } });
    try {
      const payload = '{"id":"evt_2","type":"charge.dispute.created"}';
      const ts = Math.floor(t.clock.now().getTime() / 1000);
      const sig = createHmac('sha256', 'whsec_route').update(`${ts}.${payload}`).digest('hex');
      await request(t.server).post('/api/v1/payments/stripe/webhook').set('content-type', 'application/json').set('stripe-signature', `t=${ts},v1=${sig}`).send(payload).expect(204);
      await request(t.server).post('/api/v1/payments/stripe/webhook').set('content-type', 'application/json').set('stripe-signature', `t=${ts},v1=${'1'.repeat(64)}`).send(payload).expect(403);
    } finally {
      await t.close();
    }
    const off = await createTestApp();
    try {
      await request(off.server).post('/api/v1/payments/stripe/webhook').send('{}').expect(404);
    } finally {
      await off.close();
    }
  });

  it('with Stripe on, an owner connects their Stripe account, then withdrawals go there', async () => {
    const t = await createTestApp({ env: { PAYMENTS: 'stripe', STRIPE_SECRET_KEY: stripe.key, STRIPE_API_URL: stripe.url } });
    try {
      await resetDeals(t.prisma);
      await resetAccounts(t.prisma);
      const olga = await signedInClient(t, { name: 'Olga Owner' });
      await t.prisma.$transaction((tx) => t.app.get(LedgerService).post(topUpOperation(olga.user.id, cents(5000)), tx));
      const early = await olga.post('/wallet/payouts').set('Idempotency-Key', 'payout-early').send({ amountCents: 1000, iban: 'LV80BANK0000435195001', holder: 'Olga Owner' });
      expect(early.status).toBe(409);
      expect(early.body.error.details).toMatchObject({ why: 'STRIPE_ONBOARDING_REQUIRED' });
      const { url } = (await olga.post('/wallet/stripe-onboarding').expect(200)).body;
      expect(url).toMatch(/^https:\/\/connect\.stripe\.test\/setup\/acct_/);
      const account = (await t.prisma.user.findUniqueOrThrow({ where: { id: olga.user.id } })).stripeAccountId!;
      const paid = (await olga.post('/wallet/payouts').set('Idempotency-Key', 'payout-1').send({ amountCents: 1000, iban: 'LV80BANK0000435195001', holder: 'Olga Owner' }).expect(201)).body;
      expect(paid.payout).toMatchObject({ brand: 'stripe', last4: account.slice(-4) });
      expect(stripe.calls.some((c) => c.path === '/v1/transfers' && c.form.get('destination') === account)).toBe(true);
    } finally {
      await t.close();
    }
  });

  it('3-D Secure: before the bank confirms, paying with the intent is refused; after, it succeeds for that amount only', async () => {
    const needs = await provider.charge({ token: 'pm_card_authenticationRequired', amountCents: 2500, idempotencyKey: 'sca-1', description: 'Yoyo deal' });
    if (needs.status !== 'DECLINED' || !needs.paymentIntent) throw new Error('expected an action');
    expect(await provider.charge({ token: needs.paymentIntent, amountCents: 2500, idempotencyKey: 'sca-2', description: 'x' })).toEqual({ status: 'DECLINED', declineCode: 'requires_action' });
    stripe.confirm(needs.paymentIntent);
    expect(await provider.charge({ token: needs.paymentIntent, amountCents: 9999, idempotencyKey: 'sca-3', description: 'x' })).toEqual({ status: 'DECLINED', declineCode: 'amount_mismatch' });
    expect(await provider.charge({ token: needs.paymentIntent, amountCents: 2500, idempotencyKey: 'sca-4', description: 'x' })).toEqual({ status: 'SUCCEEDED', ref: needs.paymentIntent, brand: 'visa', last4: '4242' });
    expect(await provider.charge({ token: 'pi_unknown', amountCents: 2500, idempotencyKey: 'sca-5', description: 'x' })).toEqual({ status: 'DECLINED', declineCode: 'invalid_token' });
  });

  it('a deal paid with a card that needs 3-D Secure: 402 with what the site needs, then paid with the confirmed intent', async () => {
    const t = await createTestApp({ env: { PAYMENTS: 'stripe', STRIPE_SECRET_KEY: stripe.key, STRIPE_API_URL: stripe.url } });
    try {
      await resetDeals(t.prisma);
      await resetAccounts(t.prisma);
      const owner = await signedInClient(t, { name: 'Olga Owner' });
      const renter = await signedInClient(t, { name: 'Rita Renter' });
      const listing = await seedListing(t, owner.user, { status: 'PUBLISHED', dailyCents: 1500, depositCents: 10_000 });
      const booking = await requestBooking(t, renter, listing.id, 1, 3);
      await step(owner, booking.id, { type: 'ACCEPT' });
      await step(renter, booking.id, { type: 'SIGN' });
      await step(owner, booking.id, { type: 'SIGN' });
      const version = (await renter.get(`/bookings/${booking.id}`).expect(200)).body.booking.version;
      const first = await renter.post(`/bookings/${booking.id}/events`).set('Idempotency-Key', 'pay-first-attempt').send({ version, event: { type: 'PAY', method: 'CARD', cardToken: 'pm_card_authenticationRequired' } });
      expect(first.status).toBe(402);
      expect(first.body.error.details).toMatchObject({ declineCode: 'authentication_required', clientSecret: expect.any(String), paymentIntent: expect.stringMatching(/^pi_/) });
      stripe.confirm(first.body.error.details.paymentIntent);
      const paid = await renter.post(`/bookings/${booking.id}/events`).set('Idempotency-Key', 'pay-after-bank-ok').send({ version, event: { type: 'PAY', method: 'CARD', cardToken: first.body.error.details.paymentIntent } });
      expect(paid.status).toBe(200);
      expect(paid.body.booking.status).toBe('PAID');
      expect(await t.prisma.payment.count({ where: { providerRef: first.body.error.details.paymentIntent } })).toBe(1);
    } finally {
      await t.close();
    }
  });
});
