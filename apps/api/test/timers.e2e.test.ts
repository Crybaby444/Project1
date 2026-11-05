import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { LedgerService } from '../src/ledger/ledger.service';
import { TimersService } from '../src/timers/timers.service';
import { resetAccounts, resetDeals } from './support/db';
import { day, requestBooking, returnedDeal, step } from './support/deals';
import { resetListings, seedListing, signedInClient, type Client } from './support/listings';
import { createTestApp, type TestApp } from './support/test-app';

const SECRET = 'timers-secret-for-tests-0123456789abcdef';
const HOUR = 3_600_000;

let t: TestApp;
let timers: TimersService;
let owner: Client;
let renter: Client;

beforeAll(async () => {
  t = await createTestApp({ env: { TIMERS_SECRET: SECRET } });
  timers = t.app.get(TimersService);
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
});

const status = async (id: string) => (await t.prisma.booking.findUniqueOrThrow({ where: { id } })).status;

describe('TimersService.runDue', () => {
  it('expires a request the owner did not answer in 24 hours', async () => {
    const listing = await seedListing(t, owner.user, { status: 'PUBLISHED' });
    const booking = await requestBooking(t, renter, listing.id, 5, 6);
    expect((await timers.runDue()).fired).toBe(0);
    t.clock.advance(24 * HOUR + 1);
    expect(await timers.runDue()).toMatchObject({ fired: 1, failed: 0, more: false });
    expect(await status(booking.id)).toBe('EXPIRED');
    expect(await t.prisma.bookingEvent.findMany({ where: { bookingId: booking.id, type: 'TIMEOUT' } })).toMatchObject([
      { actorKind: 'SYSTEM', data: { timer: 'REQUEST_EXPIRY' }, toStatus: 'EXPIRED' },
    ]);
  });

  it('counts an item nobody inspected for 48 hours as fine and gives the deposit back to the card', async () => {
    const id = await returnedDeal(t, owner, renter);
    t.clock.advance(48 * HOUR + 1);
    await timers.runDue();
    const booking = await t.prisma.booking.findUniqueOrThrow({ where: { id } });
    expect(booking).toMatchObject({ status: 'COMPLETED', outcome: 'DEPOSIT_REFUNDED', timerKind: null });
    const refunds = await t.prisma.paymentRefund.findMany();
    expect(refunds).toMatchObject([{ amountCents: 5_000, status: 'DONE' }]);
    expect(await t.app.get(LedgerService).balance(`deposit:${id}`)).toBe(0);
  });

  it('sends a damage claim the renter did not answer in 48 hours to an administrator', async () => {
    const id = await returnedDeal(t, owner, renter);
    const photo = await t.prisma.bookingPhoto.create({
      data: { bookingId: id, uploaderId: owner.user.id, kind: 'DAMAGE', storageKey: crypto.randomUUID(), width: 1, height: 1, bytes: 1, format: 'webp' },
    });
    await step(owner, id, { type: 'REPORT_DAMAGE', description: 'The chuck is cracked.', photoIds: [photo.id] });
    t.clock.advance(48 * HOUR + 1);
    await timers.runDue();
    expect(await t.prisma.booking.findUniqueOrThrow({ where: { id } })).toMatchObject({ status: 'DISPUTED', disputeReason: 'DAMAGE' });
  });

  it('fires each timer once when two runs overlap', async () => {
    const ids = [];
    for (let i = 0; i < 6; i++) {
      const listing = await seedListing(t, owner.user, { status: 'PUBLISHED' });
      ids.push((await requestBooking(t, renter, listing.id, 5, 6)).id);
    }
    t.clock.advance(24 * HOUR + 1);
    const [a, b] = await Promise.all([timers.runDue(), timers.runDue()]);
    expect(a.fired + b.fired).toBe(6);
    expect(await t.prisma.bookingEvent.count({ where: { type: 'TIMEOUT' } })).toBe(6);
    expect((await timers.runDue()).fired).toBe(0);
  });

  it('marks offers past their time and forgets idempotency keys older than a day', async () => {
    const listing = await seedListing(t, owner.user, { status: 'PUBLISHED' });
    await renter.post(`/listings/${listing.id}/offers`).send({ start: day(t, 5), end: day(t, 6), dailyCents: 1000 }).expect(201);
    await t.prisma.idempotencyKey.create({ data: { userId: renter.user.id, key: 'old-key-0001', scope: 'POST /x', requestHash: 'h', createdAt: t.clock.now() } });
    t.clock.advance(24 * HOUR + 1);
    expect(await timers.runDue()).toMatchObject({ offersExpired: 1, keysForgotten: 1 });
    expect((await t.prisma.offer.findFirstOrThrow()).status).toBe('EXPIRED');
  });
});

describe('POST /internal/timers/run', () => {
  const call = (authorization?: string) => {
    const req = request(t.server).post('/api/v1/internal/timers/run');
    return authorization === undefined ? req : req.set('Authorization', authorization);
  };

  it('runs the due timers for the scheduled workflow, with the secret', async () => {
    const listing = await seedListing(t, owner.user, { status: 'PUBLISHED' });
    await requestBooking(t, renter, listing.id, 5, 6);
    t.clock.advance(24 * HOUR + 1);
    const res = await call(`Bearer ${SECRET}`).expect(200);
    expect(res.body).toMatchObject({ fired: 1, failed: 0 });
  });

  it('answers 401 without the secret or with a wrong one', async () => {
    expect((await call().expect(401)).body.error.code).toBe('AUTH_UNAUTHENTICATED');
    await call(`Bearer ${SECRET}x`).expect(401);
    await call(SECRET).expect(401);
  });

  it('does not exist when no secret is configured', async () => {
    const plain = await createTestApp({ env: { TIMERS_SECRET: '' } });
    try {
      await request(plain.server).post('/api/v1/internal/timers/run').set('Authorization', `Bearer ${SECRET}`).expect(404);
    } finally {
      await plain.close();
    }
  });
});
