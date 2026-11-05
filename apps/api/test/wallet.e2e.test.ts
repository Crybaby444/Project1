import { cents, topUp as topUpOperation } from '@yoyo/domain';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { LedgerService } from '../src/ledger/ledger.service';
import { resetAccounts, resetDeals } from './support/db';
import { CARDS, cardToken, newKey, topUp } from './support/deals';
import { signedInClient, type Client } from './support/listings';
import { createTestApp, type TestApp } from './support/test-app';

let t: TestApp;

beforeAll(async () => {
  t = await createTestApp();
});

afterAll(async () => {
  await t.close();
});

beforeEach(async () => {
  await resetDeals(t.prisma);
  await resetAccounts(t.prisma);
});

const cleanBooks = async () =>
  expect(await t.app.get(LedgerService).audit()).toEqual({ sumOfAll: 0, mismatched: [], unbalancedOperations: [], negative: [] });

async function topUpRequest(client: Client, amountCents: number, number: string = CARDS.visa, key = newKey()) {
  const token = await cardToken(client, number);
  return client.post('/wallet/top-ups').set('Idempotency-Key', key).send({ amountCents, cardToken: token });
}

describe('wallet', () => {
  it('starts empty', async () => {
    const anna = await signedInClient(t);
    expect((await anna.get('/wallet').expect(200)).body).toEqual({ balanceCents: 0, heldCents: 0 });
    expect((await anna.get('/wallet/transactions').expect(200)).body).toEqual({ items: [], total: 0 });
    await request(t.server).get('/api/v1/wallet').expect(401);
  });

  it('tops up by card and shows it in the history', async () => {
    const anna = await signedInClient(t);
    const res = await topUpRequest(anna, 2_500);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      balanceCents: 2_500,
      payment: { id: expect.any(String), amountCents: 2_500, brand: 'visa', last4: '4242' },
    });
    expect((await anna.get('/wallet').expect(200)).body.balanceCents).toBe(2_500);
    const history = (await anna.get('/wallet/transactions').expect(200)).body;
    expect(history).toEqual({
      items: [{ id: expect.any(String), kind: 'TOP_UP', amountCents: 2_500, bookingId: null, createdAt: expect.any(String) }],
      total: 1,
    });
    const payment = await t.prisma.payment.findFirstOrThrow();
    expect(payment).toMatchObject({ purpose: 'TOP_UP', amountCents: 2_500, brand: 'visa', last4: '4242', userId: anna.user.id });
    await cleanBooks();
  });

  it('answers 402 for a declined card and changes nothing', async () => {
    const anna = await signedInClient(t);
    const res = await topUpRequest(anna, 2_500, CARDS.noFunds);
    expect(res.status).toBe(402);
    expect(res.body.error).toMatchObject({ code: 'PAYMENT_DECLINED', details: { declineCode: 'insufficient_funds' } });
    expect((await anna.get('/wallet').expect(200)).body.balanceCents).toBe(0);
    expect(await t.prisma.payment.count()).toBe(0);
  });

  it('takes the money once when the same top-up is sent twice', async () => {
    const anna = await signedInClient(t);
    const key = newKey();
    const token = await cardToken(anna);
    const send = () => anna.post('/wallet/top-ups').set('Idempotency-Key', key).send({ amountCents: 1_000, cardToken: token });
    await send().expect(201);
    const again = await send().expect(201);
    expect(again.headers['idempotent-replayed']).toBe('true');
    expect((await anna.get('/wallet').expect(200)).body.balanceCents).toBe(1_000);
    expect(await t.prisma.payment.count()).toBe(1);
  });

  it('keeps top-ups within the limits', async () => {
    const anna = await signedInClient(t);
    expect((await topUpRequest(anna, 99)).status).toBe(400);
    expect((await topUpRequest(anna, 50_001)).status).toBe(400);
    expect((await topUpRequest(anna, 1_000, CARDS.visa)).status).toBe(201);
    // 499 500 in the wallet (one balanced operation, as if by many top-ups): one more euro is over the limit.
    const ledger = t.app.get(LedgerService);
    await t.prisma.$transaction((tx) => ledger.post(topUpOperation(anna.user.id, cents(498_500)), tx));
    const over = await topUpRequest(anna, 1_000);
    expect(over.status).toBe(409);
    expect(over.body.error.code).toBe('WALLET_LIMIT');
    expect(await t.prisma.payment.count()).toBe(1);
    await cleanBooks();
  });

  it('pays out to a card', async () => {
    const anna = await signedInClient(t);
    await topUp(anna, 5_000);
    const mastercard = await cardToken(anna, CARDS.mastercard);
    const res = await anna.post('/wallet/payouts').set('Idempotency-Key', newKey()).send({ amountCents: 2_000, cardToken: mastercard });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      balanceCents: 3_000,
      payout: { id: expect.any(String), amountCents: 2_000, brand: 'mastercard', last4: '4444', status: 'DONE' },
    });
    const payout = await t.prisma.payout.findFirstOrThrow();
    expect(payout).toMatchObject({ status: 'DONE', providerRef: expect.stringMatching(/^po_/), attempts: 1 });
    expect(payout.destinationToken).not.toContain('5555');
    await cleanBooks();
  });

  it('lets only one of two parallel 80 € payouts through a 100 € wallet', async () => {
    const anna = await signedInClient(t);
    await topUp(anna, 10_000);
    const token = await cardToken(anna);
    const results = await Promise.all(
      [1, 2].map(() => anna.post('/wallet/payouts').set('Idempotency-Key', newKey()).send({ amountCents: 8_000, cardToken: token })),
    );
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(results.find((r) => r.status === 409)!.body.error).toMatchObject({ code: 'INSUFFICIENT_FUNDS', details: { shortfallCents: 6_000 } });
    expect((await anna.get('/wallet').expect(200)).body.balanceCents).toBe(2_000);
    expect(await t.prisma.payout.count()).toBe(1);
    await cleanBooks();
  });

  it('needs an Idempotency-Key to move money', async () => {
    const anna = await signedInClient(t);
    const token = await cardToken(anna);
    expect((await anna.post('/wallet/top-ups').send({ amountCents: 1_000, cardToken: token }).expect(400)).body.error.code).toBe(
      'IDEMPOTENCY_KEY_REQUIRED',
    );
    expect((await anna.post('/wallet/payouts').send({ amountCents: 1_000, cardToken: token }).expect(400)).body.error.code).toBe(
      'IDEMPOTENCY_KEY_REQUIRED',
    );
  });

  it('refuses a card token that is not ours', async () => {
    const anna = await signedInClient(t);
    await topUp(anna, 5_000);
    const res = await anna.post('/wallet/payouts').set('Idempotency-Key', newKey()).send({ amountCents: 1_000, cardToken: 'tok_forged.token' });
    expect(res.status).toBe(400);
    expect(res.body.error.fields).toEqual({ cardToken: expect.any(String) });
  });
});
