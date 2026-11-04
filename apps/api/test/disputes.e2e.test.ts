import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { LedgerService } from '../src/ledger/ledger.service';
import { resetAccounts, resetDeals } from './support/db';
import { newKey, paidDeal, returnedDeal, step } from './support/deals';
import { resetListings, signedInClient, type Client } from './support/listings';
import { createTestApp, type TestApp } from './support/test-app';

let t: TestApp;
let ledger: LedgerService;
let owner: Client;
let renter: Client;
let admin: Client;

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
  owner = await signedInClient(t);
  renter = await signedInClient(t);
  admin = await signedInClient(t, { role: 'ADMIN' });
});

async function resolve(client: Client, id: string, decision: string, version?: number) {
  const current = version ?? (await admin.get(`/bookings/${id}`)).body.booking.version;
  return client
    .post(`/admin/bookings/${id}/resolve`)
    .set('Idempotency-Key', newKey())
    .send({ version: current, decision, comment: 'Looked at the photos and the chat' });
}

/** Paid (15 € × 3, 50 € deposit, 99,50 € by card), handed over, and the renter says it never came. */
async function notHandedOver(): Promise<string> {
  const id = await paidDeal(t, owner, renter);
  await step(owner, id, { type: 'MARK_HANDED_OVER' });
  await step(renter, id, { type: 'REPORT_NOT_RECEIVED', note: 'Nobody came' });
  return id;
}

async function damageDispute(): Promise<string> {
  const id = await returnedDeal(t, owner, renter);
  const photo = await t.prisma.bookingPhoto.create({
    data: { bookingId: id, uploaderId: owner.user.id, kind: 'DAMAGE', storageKey: crypto.randomUUID(), width: 1, height: 1, bytes: 1, format: 'webp' },
  });
  await step(owner, id, { type: 'REPORT_DAMAGE', description: 'The chuck is cracked.', photoIds: [photo.id] });
  await step(renter, id, { type: 'REJECT_DAMAGE', note: 'It was cracked before' });
  return id;
}

const cleanBooks = async () => expect(await ledger.audit()).toEqual({ sumOfAll: 0, mismatched: [], unbalancedOperations: [], negative: [] });

describe('dispute resolution', () => {
  it('REFUND_ALL cancels a deal that was never handed over and gives everything back', async () => {
    const id = await notHandedOver();
    const res = await resolve(admin, id, 'REFUND_ALL');
    expect(res.status).toBe(200);
    expect(res.body.booking).toMatchObject({ status: 'CANCELLED', outcome: 'REFUNDED_ALL', viewerRole: 'ADMIN' });
    expect((await t.prisma.paymentRefund.findFirstOrThrow()).amountCents).toBe(9_950);
    const [row] = await t.prisma.$queryRaw<{ r: string | null }[]>`SELECT reserved::text AS r FROM "Booking" WHERE id = ${id}`;
    expect(row?.r).toBeNull();
    await cleanBooks();
  });

  it('CONFIRM_HANDOVER puts the deal back on track and pays the owner the rent', async () => {
    const id = await notHandedOver();
    const res = await resolve(admin, id, 'CONFIRM_HANDOVER');
    expect(res.body.booking).toMatchObject({ status: 'ACTIVE', dispute: { resolution: { decision: 'CONFIRM_HANDOVER' } } });
    expect(await ledger.balance(`wallet:${owner.user.id}`)).toBe(4_500);
    await cleanBooks();
  });

  it('a damage dispute ends with the deposit with the owner or back with the renter', async () => {
    const toOwner = await damageDispute();
    expect((await resolve(admin, toOwner, 'DEPOSIT_TO_OWNER')).body.booking).toMatchObject({ status: 'COMPLETED', outcome: 'DEPOSIT_TO_OWNER' });
    expect(await ledger.balance(`wallet:${owner.user.id}`)).toBe(9_500);
    const back = await damageDispute();
    expect((await resolve(admin, back, 'REFUND_DEPOSIT')).body.booking).toMatchObject({ status: 'COMPLETED', outcome: 'DEPOSIT_REFUNDED' });
    await cleanBooks();
  });

  it('refuses a decision that does not fit the dispute', async () => {
    const id = await damageDispute();
    const res = await resolve(admin, id, 'REFUND_ALL');
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ACTION_NOT_ALLOWED');
  });

  it('is for administrators only, who never decide their own deals', async () => {
    const id = await notHandedOver();
    expect((await resolve(renter, id, 'REFUND_ALL', 0)).status).toBe(403);
    const ownerAdmin = await signedInClient(t, { role: 'ADMIN' });
    const own = await paidDeal(t, ownerAdmin, renter);
    await step(ownerAdmin, own, { type: 'MARK_HANDED_OVER' });
    await step(renter, own, { type: 'REPORT_NOT_RECEIVED', note: 'Nobody came' });
    expect((await resolve(ownerAdmin, own, 'REFUND_ALL')).status).toBe(403);
  });

  it('needs the version the administrator looked at, and an Idempotency-Key', async () => {
    const id = await notHandedOver();
    const stale = await resolve(admin, id, 'REFUND_ALL', 1);
    expect(stale.status).toBe(409);
    expect(stale.body.error).toMatchObject({ code: 'INVALID_STATUS', details: { currentVersion: expect.any(Number) } });
    const noKey = await admin.post(`/admin/bookings/${id}/resolve`).send({ version: 7, decision: 'REFUND_ALL', comment: 'x' });
    expect(noKey.body.error.code).toBe('IDEMPOTENCY_KEY_REQUIRED');
  });
});

describe('admin views of deals and the ledger', () => {
  it('lists deals, disputes first when asked', async () => {
    const disputed = await notHandedOver();
    await paidDeal(t, owner, renter);
    expect((await admin.get('/admin/bookings').expect(200)).body.total).toBe(2);
    expect((await admin.get('/admin/bookings?disputed=true').expect(200)).body).toMatchObject({ items: [{ id: disputed, status: 'DISPUTED' }], total: 1 });
    expect((await admin.get('/admin/bookings?status=PAID').expect(200)).body.total).toBe(1);
    await renter.get('/admin/bookings').expect(403);
  });

  it('shows one deal with its journal, money and photos', async () => {
    const id = await notHandedOver();
    const res = await admin.get(`/admin/bookings/${id}`).expect(200);
    expect(res.body.booking).toMatchObject({ id, status: 'DISPUTED', actions: ['RESOLVE'] });
    expect(res.body.events.map((e: { type: string }) => e.type)).toEqual(['REQUEST', 'ACCEPT', 'SIGN', 'SIGN', 'PAY', 'MARK_HANDED_OVER', 'REPORT_NOT_RECEIVED']);
    expect(res.body.operations).toMatchObject([{ kind: 'BOOKING_PAYMENT', bookingId: id }]);
    expect(res.body.payments).toMatchObject([{ amountCents: 9_950, refundedCents: 0, last4: '4242', refunds: [] }]);
    expect(JSON.stringify(res.body)).not.toContain('tok_');
    await renter.get(`/admin/bookings/${id}`).expect(403);
  });

  it('shows the journal, the balances and a summary that adds up', async () => {
    const id = await notHandedOver();
    expect((await admin.get(`/admin/ledger/operations?bookingId=${id}`).expect(200)).body).toMatchObject({
      items: [{ kind: 'BOOKING_PAYMENT', postings: expect.arrayContaining([{ account: `escrow:${id}`, amount: 4_500 }]) }],
      total: 1,
    });
    expect((await admin.get('/admin/ledger/accounts?prefix=escrow:').expect(200)).body).toEqual({ items: [{ id: `escrow:${id}`, balance: 4_500 }], total: 1 });
    expect((await admin.get('/admin/ledger/summary').expect(200)).body).toEqual({
      revenueCents: 450,
      escrowCents: 4_500,
      depositsCents: 5_000,
      walletsCents: 0,
      externalCents: -9_950,
      audit: { sumOfAll: 0, mismatched: [], unbalancedOperations: [], negative: [] },
    });
    await renter.get('/admin/ledger/summary').expect(403);
  });
});
