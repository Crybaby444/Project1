import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetAccounts, resetDeals } from './support/db';
import { act, again, day, requestBooking, step } from './support/deals';
import { resetListings, seedListing, signedInClient, type Client } from './support/listings';
import { createTestApp, type TestApp } from './support/test-app';

let t: TestApp;
let owner: Client;
let renter: Client;

beforeAll(async () => {
  t = await createTestApp();
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

const HOUR = 3_600_000;

async function reserved(bookingId: string): Promise<string | null> {
  const [row] = await t.prisma.$queryRaw<{ r: string | null }[]>`SELECT reserved::text AS r FROM "Booking" WHERE id = ${bookingId}`;
  return row?.r ?? null;
}

async function requested(from = 2, to = 4) {
  const listing = await seedListing(t, owner.user, { status: 'PUBLISHED' });
  return { listing, booking: await requestBooking(t, renter, listing.id, from, to) };
}

describe('deal steps before payment', () => {
  it('ACCEPT reserves the days, freezes the contract and starts the payment deadline', async () => {
    const { booking } = await requested();
    const accepted = await step(owner, booking.id, { type: 'ACCEPT' });
    expect(accepted).toMatchObject({ status: 'ACCEPTED', version: 1, hasContract: true, deadline: { timer: 'PAYMENT_EXPIRY' }, actions: ['CANCEL'], signatures: [] });
    // The renter signs first: only they have the button now.
    expect((await renter.get(`/bookings/${booking.id}`)).body.booking.actions).toEqual(['SIGN', 'CANCEL']);
    expect(await reserved(booking.id)).toBe(`[${day(t, 2)},${day(t, 5)})`);
    const contract = await t.prisma.contract.findUniqueOrThrow({ where: { bookingId: booking.id } });
    expect(contract.termsHash).toMatch(/^[0-9a-f]{64}$/);
    expect(contract.terms).toMatchObject({
      renter: { name: 'Anna', email: renter.email },
      owner: { name: 'Andris', email: owner.email },
      listing: { title: 'Bosch cordless drill' },
      period: { start: day(t, 2), end: day(t, 4) },
      quote: { totalCents: booking['quote'] && (booking['quote'] as { totalCents: number }).totalCents },
    });
    const events = await t.prisma.bookingEvent.findMany({ where: { bookingId: booking.id }, orderBy: { createdAt: 'asc' } });
    expect(events.map((e) => [e.type, e.fromStatus, e.toStatus, e.actorKind])).toEqual([
      ['REQUEST', null, 'REQUESTED', 'RENTER'],
      ['ACCEPT', 'REQUESTED', 'ACCEPTED', 'OWNER'],
    ]);
  });

  it('the renter signs first, then the owner; each signature is kept with the terms it covers', async () => {
    const { booking } = await requested();
    await step(owner, booking.id, { type: 'ACCEPT' });
    const early = await act(owner, booking.id, { type: 'SIGN' }, 1);
    expect(early.status).toBe(409);
    expect(early.body.error?.code).toBe('CONTRACT_NOT_SIGNED');
    await renter
      .post(`/bookings/${booking.id}/events`)
      .set('Idempotency-Key', 'sign-renter-1')
      .set('User-Agent', 'test-browser')
      .send({ version: 1, event: { type: 'SIGN', fullName: 'Anna Ozola', consent: true } })
      .expect(200);
    const view = (await owner.get(`/bookings/${booking.id}`)).body.booking;
    expect(view.actions).toEqual(['SIGN', 'CANCEL']);
    expect(view.signatures).toEqual([{ side: 'RENTER', fullName: 'Anna Ozola', signedAt: expect.any(String), method: 'SIMULATED' }]);
    await step(owner, booking.id, { type: 'SIGN' });
    const contract = await t.prisma.contract.findUniqueOrThrow({ where: { bookingId: booking.id }, include: { signatures: true } });
    expect(contract.signatures.map((s) => [s.side, s.termsHash === contract.termsHash, s.userAgent])).toEqual(
      expect.arrayContaining([
        ['RENTER', true, 'test-browser'],
        ['OWNER', true, expect.any(String)],
      ]),
    );
    const notices = await t.prisma.notification.findMany({ where: { bookingId: booking.id } });
    expect(notices.map((n) => [n.userId === owner.user.id ? 'owner' : 'renter', n.event])).toEqual(
      expect.arrayContaining([
        ['owner', 'RENTER_SIGNED'],
        ['renter', 'CONTRACT_SIGNED'],
      ]),
    );
  });

  it('payment checks the recorded signatures, not only the dates', async () => {
    const { booking } = await requested();
    await step(owner, booking.id, { type: 'ACCEPT' });
    await step(renter, booking.id, { type: 'SIGN' });
    await step(owner, booking.id, { type: 'SIGN' });
    // Someone tampers with the terms after signing: the fingerprints no longer match.
    await t.prisma.contract.update({ where: { bookingId: booking.id }, data: { termsHash: 'f'.repeat(64) } });
    const pay = await act(renter, booking.id, { type: 'PAY', method: 'WALLET' }, 3);
    expect(pay.status).toBe(409);
    expect(pay.body.error).toMatchObject({ code: 'CONTRACT_NOT_SIGNED', details: { renterSigned: false, ownerSigned: false } });
  });

  it('both sides sign; signing again changes nothing', async () => {
    const { booking } = await requested();
    await step(owner, booking.id, { type: 'ACCEPT' });
    await step(renter, booking.id, { type: 'SIGN' });
    const signedTwice = await step(renter, booking.id, { type: 'SIGN' });
    expect(signedTwice.version).toBe(2);
    const both = await step(owner, booking.id, { type: 'SIGN' });
    expect(both).toMatchObject({ version: 3, renterSignedAt: expect.any(String), ownerSignedAt: expect.any(String) });
    expect((await renter.get(`/bookings/${booking.id}`)).body.booking.actions).toEqual(['PAY', 'CANCEL']);
  });

  it('DECLINE, WITHDRAW and CANCEL close the deal and free the days', async () => {
    const a = await requested();
    expect(await step(owner, a.booking.id, { type: 'DECLINE', reason: 'Away that week' })).toMatchObject({ status: 'DECLINED', declineReason: 'Away that week' });
    const b = await requestBooking(t, renter, a.listing.id, 2, 4);
    expect(await step(renter, b.id, { type: 'WITHDRAW' })).toMatchObject({ status: 'CANCELLED', cancellation: { by: 'RENTER' } });
    const c = await requestBooking(t, renter, a.listing.id, 2, 4);
    await step(owner, c.id, { type: 'ACCEPT' });
    expect(await step(owner, c.id, { type: 'CANCEL', reason: 'The drill broke' })).toMatchObject({ status: 'CANCELLED', cancellation: { by: 'OWNER', reason: 'The drill broke' } });
    expect(await reserved(c.id)).toBeNull();
    // The days are free again: a new request can be accepted.
    const d = await requestBooking(t, renter, a.listing.id, 2, 4);
    await step(owner, d.id, { type: 'ACCEPT' });
  });

  it('refuses a stale version with the current one', async () => {
    const { booking } = await requested();
    await step(owner, booking.id, { type: 'ACCEPT' });
    const stale = await act(renter, booking.id, { type: 'SIGN' }, 0);
    expect(stale.status).toBe(409);
    expect(stale.body.error).toMatchObject({ code: 'INVALID_STATUS', details: { currentVersion: 1 } });
  });

  it('refuses a step that is not the actor\'s to take', async () => {
    const { booking } = await requested();
    const res = await act(renter, booking.id, { type: 'ACCEPT' });
    expect(res.status).toBe(409);
    expect(res.body.error?.code).toBe('ACTION_NOT_ALLOWED');
  });

  it('is invisible to anyone else, administrators included', async () => {
    const { booking } = await requested();
    const stranger = await signedInClient(t);
    expect((await act(stranger, booking.id, { type: 'ACCEPT' }, 0)).status).toBe(404);
    const admin = await signedInClient(t, { role: 'ADMIN' });
    expect((await act(admin, booking.id, { type: 'ACCEPT' }, 0)).status).toBe(404);
  });

  it('needs an Idempotency-Key and replays a repeated step', async () => {
    const { booking } = await requested();
    const body = { version: 0, event: { type: 'ACCEPT' } };
    expect((await owner.post(`/bookings/${booking.id}/events`).send(body)).body.error.code).toBe('IDEMPOTENCY_KEY_REQUIRED');
    const first = await owner.post(`/bookings/${booking.id}/events`).set('Idempotency-Key', 'accept-once-1').send(body).expect(200);
    const replay = await owner.post(`/bookings/${booking.id}/events`).set('Idempotency-Key', 'accept-once-1').send(body).expect(200);
    expect(replay.body).toEqual(first.body);
    expect(await t.prisma.bookingEvent.count({ where: { bookingId: booking.id, type: 'ACCEPT' } })).toBe(1);
  });

  it('lets a passed deadline win over a late step: 409 DEADLINE_PASSED and the deal moved on', async () => {
    const { booking } = await requested(5, 6);
    t.clock.advance(24 * HOUR + 1);
    const late = await act(await again(t, owner), booking.id, { type: 'ACCEPT' }, 0);
    expect(late.status).toBe(409);
    expect(late.body.error).toMatchObject({ code: 'DEADLINE_PASSED', details: { status: 'EXPIRED' } });
    const now = (await (await again(t, renter)).get(`/bookings/${booking.id}`)).body.booking;
    expect(now).toMatchObject({ status: 'EXPIRED', version: 1, actions: [] });
    const events = await t.prisma.bookingEvent.findMany({ where: { bookingId: booking.id, type: 'TIMEOUT' } });
    expect(events).toMatchObject([{ actorKind: 'SYSTEM', fromStatus: 'REQUESTED', toStatus: 'EXPIRED', data: { timer: 'REQUEST_EXPIRY' } }]);
  });
});
