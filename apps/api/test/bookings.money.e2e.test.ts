import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { LedgerService } from '../src/ledger/ledger.service';
import { resetAccounts, resetDeals } from './support/db';
import { act, CARDS, cardToken, newKey, requestBooking, step, topUp } from './support/deals';
import { resetListings, seedListing, signedInClient, type Client } from './support/listings';
import { createTestApp, type TestApp } from './support/test-app';

let t: TestApp;
let owner: Client;
let renter: Client;
let ledger: LedgerService;

beforeAll(async () => {
  t = await createTestApp();
  ledger = t.app.get(LedgerService);
});

afterAll(async () => {
  await t.close();
});

beforeEach(async () => {
  await resetDeals(t.prisma);
  await resetListings(t);
  await resetAccounts(t.prisma);
  owner = await signedInClient(t, { name: 'Andris' });
  renter = await signedInClient(t, { name: 'Anna' });
});

const balance = (account: string) => ledger.balance(account);

async function cleanBooks(): Promise<void> {
  expect(await ledger.audit()).toEqual({ sumOfAll: 0, mismatched: [], unbalancedOperations: [], negative: [] });
}

/** The README example: 3 days at 15 €, 100 € deposit, signed by both, ready to pay. */
async function signedDeal(): Promise<string> {
  const listing = await seedListing(t, owner.user, { status: 'PUBLISHED', dailyCents: 1500, depositCents: 10_000 });
  const booking = await requestBooking(t, renter, listing.id, 1, 3);
  await step(owner, booking.id, { type: 'ACCEPT' });
  await step(renter, booking.id, { type: 'SIGN' });
  await step(owner, booking.id, { type: 'SIGN' });
  return booking.id;
}

async function payByCard(id: string, number: string = CARDS.visa) {
  const token = await cardToken(renter, number);
  return act(renter, id, { type: 'PAY', method: 'CARD', cardToken: token });
}

async function toReturned(id: string): Promise<void> {
  await step(owner, id, { type: 'MARK_HANDED_OVER' });
  await step(renter, id, { type: 'CONFIRM_RECEIVED' });
  await step(renter, id, { type: 'MARK_RETURNED' });
  await step(owner, id, { type: 'CONFIRM_RETURNED' });
}

describe('paying and the deposit rule', () => {
  it('by card, all fine: the renter spends 49,50 €, the owner gets 45,00 €, Yoyo 4,50 €', async () => {
    const id = await signedDeal();
    const paid = await payByCard(id);
    expect(paid.status).toBe(200);
    expect(paid.body.booking).toMatchObject({ status: 'PAID', paymentMethod: 'CARD', deadline: { timer: 'HANDOVER_DEADLINE' } });
    expect(await balance(`escrow:${id}`)).toBe(4_500);
    expect(await balance(`deposit:${id}`)).toBe(10_000);
    expect(await balance('platform:revenue')).toBe(450);

    await step(owner, id, { type: 'MARK_HANDED_OVER' });
    await step(renter, id, { type: 'CONFIRM_RECEIVED' });
    expect(await balance(`wallet:${owner.user.id}`)).toBe(4_500);
    expect(await balance(`escrow:${id}`)).toBe(0);
    await step(renter, id, { type: 'MARK_RETURNED' });
    await step(owner, id, { type: 'CONFIRM_RETURNED' });
    const done = await step(owner, id, { type: 'ALL_FINE' });
    expect(done).toMatchObject({ status: 'COMPLETED', outcome: 'DEPOSIT_REFUNDED' });

    expect(await balance(`deposit:${id}`)).toBe(0);
    expect(await balance('external:card')).toBe(-4_950);
    const payment = await t.prisma.payment.findFirstOrThrow({ where: { bookingId: id }, include: { refunds: true } });
    expect(payment).toMatchObject({ purpose: 'BOOKING', amountCents: 14_950, refundedCents: 10_000, brand: 'visa', last4: '4242' });
    expect(payment.refunds).toMatchObject([{ amountCents: 10_000, status: 'DONE', providerRef: expect.stringMatching(/^re_/) }]);
    await cleanBooks();
  });

  it('from the wallet, damage accepted: the deposit goes to the owner (145,00 €)', async () => {
    await topUp(renter, 20_000);
    const id = await signedDeal();
    await step(renter, id, { type: 'PAY', method: 'WALLET' });
    expect(await balance(`wallet:${renter.user.id}`)).toBe(5_050);
    expect((await renter.get('/wallet')).body).toEqual({ balanceCents: 5_050, heldCents: 14_500 });
    await toReturned(id);
    await step(owner, id, { type: 'REPORT_DAMAGE', description: 'The chuck is cracked.', photoIds: await damagePhotos(id) });
    const done = await step(renter, id, { type: 'ACCEPT_DAMAGE' });
    expect(done).toMatchObject({ status: 'COMPLETED', outcome: 'DEPOSIT_TO_OWNER' });
    expect(await balance(`wallet:${owner.user.id}`)).toBe(14_500);
    expect(await balance(`wallet:${renter.user.id}`)).toBe(5_050);
    expect((await renter.get('/wallet')).body.heldCents).toBe(0);
    await cleanBooks();
  });

  it('a damage claim the renter rejects goes to an administrator with the deposit frozen', async () => {
    const id = await signedDeal();
    await payByCard(id);
    await toReturned(id);
    await step(owner, id, { type: 'REPORT_DAMAGE', description: 'The chuck is cracked.', photoIds: await damagePhotos(id) });
    const disputed = await step(renter, id, { type: 'REJECT_DAMAGE', note: 'It was like that before' });
    expect(disputed).toMatchObject({ status: 'DISPUTED', dispute: { reason: 'DAMAGE', note: 'It was like that before' } });
    expect(await balance(`deposit:${id}`)).toBe(10_000);
    await cleanBooks();
  });

  it('the owner cancelling before the handover gives everything back to the card', async () => {
    const id = await signedDeal();
    await payByCard(id);
    const cancelled = await step(owner, id, { type: 'CANCEL', reason: 'The drill broke' });
    expect(cancelled).toMatchObject({ status: 'CANCELLED', outcome: 'REFUNDED_ALL' });
    const payment = await t.prisma.payment.findFirstOrThrow({ where: { bookingId: id }, include: { refunds: true } });
    expect(payment.refundedCents).toBe(14_950);
    expect(payment.refunds).toMatchObject([{ amountCents: 14_950, status: 'DONE' }]);
    expect(await balance('platform:revenue')).toBe(0);
    expect(await balance('external:card')).toBe(0);
    await cleanBooks();
  });

  it('a declined card answers 402 and the deal waits for payment', async () => {
    const id = await signedDeal();
    const res = await payByCard(id, CARDS.declined);
    expect(res.status).toBe(402);
    expect(res.body.error).toMatchObject({ code: 'PAYMENT_DECLINED', details: { declineCode: 'card_declined' } });
    expect((await renter.get(`/bookings/${id}`)).body.booking.status).toBe('ACCEPTED');
    expect(await t.prisma.payment.count()).toBe(0);
  });

  it('a short wallet answers 409 INSUFFICIENT_FUNDS', async () => {
    await topUp(renter, 10_000);
    const id = await signedDeal();
    const res = await act(renter, id, { type: 'PAY', method: 'WALLET' });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ code: 'INSUFFICIENT_FUNDS', details: { shortfallCents: 4_950 } });
  });

  it('a double click with one key charges once', async () => {
    const id = await signedDeal();
    const token = await cardToken(renter);
    const key = newKey();
    const send = () => renter.post(`/bookings/${id}/events`).set('Idempotency-Key', key).send({ version: 3, event: { type: 'PAY', method: 'CARD', cardToken: token } });
    const [a, b] = await Promise.all([send(), send()]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    const again = await send();
    expect(again.status).toBe(200);
    expect(await t.prisma.payment.count()).toBe(1);
    await cleanBooks();
  });

  it('two payments with different keys: one charge stays, the other is given back', async () => {
    const id = await signedDeal();
    const [t1, t2] = [await cardToken(renter), await cardToken(renter)];
    const pay = (token: string) =>
      renter.post(`/bookings/${id}/events`).set('Idempotency-Key', newKey()).send({ version: 3, event: { type: 'PAY', method: 'CARD', cardToken: token } });
    const results = await Promise.all([pay(t1), pay(t2)]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await t.prisma.payment.count()).toBe(1);
    expect(await balance('external:card')).toBe(-14_950);
    await cleanBooks();
  });

  it('refuses to take money for a blocked owner', async () => {
    const id = await signedDeal();
    await t.prisma.user.update({ where: { id: owner.user.id }, data: { blockedAt: t.clock.now() } });
    const res = await payByCard(id);
    expect(res.status).toBe(409);
    expect(res.body.error?.code).toBe('LISTING_UNAVAILABLE');
    expect(await t.prisma.payment.count()).toBe(0);
  });
});

describe('concurrent money of one wallet', () => {
  it('a wallet payment and a refund to the same wallet at the same moment both go through (no deadlock)', async () => {
    for (let round = 0; round < 10; round++) {
      // A renter per round: the request limit per renter stays out of the way.
      const payer = await signedInClient(t);
      await topUp(payer, 10_000);
      const listingA = await seedListing(t, owner.user, { status: 'PUBLISHED', dailyCents: 1000, depositCents: 1000 });
      const listingB = await seedListing(t, owner.user, { status: 'PUBLISHED', dailyCents: 1000, depositCents: 1000 });
      const a = await requestBooking(t, payer, listingA.id, 1, 1);
      const b = await requestBooking(t, payer, listingB.id, 1, 1);
      for (const id of [a.id, b.id]) {
        await step(owner, id, { type: 'ACCEPT' });
        await step(payer, id, { type: 'SIGN' });
        await step(owner, id, { type: 'SIGN' });
      }
      await step(payer, b.id, { type: 'PAY', method: 'WALLET' });
      const [pay, cancel] = await Promise.all([
        act(payer, a.id, { type: 'PAY', method: 'WALLET' }, 3),
        act(owner, b.id, { type: 'CANCEL', reason: 'Sorry' }, 4),
      ]);
      expect({ round, pay: pay.status, cancel: cancel.status }).toEqual({ round, pay: 200, cancel: 200 });
    }
    await cleanBooks();
  });
});

/** Ids of damage photos on the booking (uploaded through the API from Task 9 on). */
async function damagePhotos(bookingId: string): Promise<string[]> {
  const photo = await t.prisma.bookingPhoto.create({
    data: { bookingId, uploaderId: owner.user.id, kind: 'DAMAGE', storageKey: crypto.randomUUID(), width: 10, height: 10, bytes: 10, format: 'webp' },
  });
  return [photo.id];
}
