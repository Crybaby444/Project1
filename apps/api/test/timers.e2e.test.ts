import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { LedgerService } from '../src/ledger/ledger.service';
import { TimersService } from '../src/timers/timers.service';
import { resetAccounts, resetDeals } from './support/db';
import { addDays, localDate, localDateIn } from '@yoyo/domain';
import { again, cardToken, day, requestBooking, returnedDeal, step } from './support/deals';
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

describe('reminders of the handover and the return', () => {
  /** The hour it is in Riga at `at`. */
  const rigaHour = (at: Date) => Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Riga', hour: 'numeric', hourCycle: 'h23' }).format(at));
  /** `hour`:30 in Riga on `date`. */
  const rigaAt = (date: string, hour: number) =>
    ['+02:00', '+03:00']
      .map((zone) => new Date(`${date}T${String(hour).padStart(2, '0')}:30:00${zone}`))
      .find((at) => rigaHour(at) === hour && localDateIn(at, 'Europe/Riga') === date)!;
  /** Moves the clock forward to `at` (never back) and signs both people in again (access tokens last 15 minutes). */
  const moveTo = async (at: Date) => {
    const ms = at.getTime() - t.clock.now().getTime();
    expect(ms).toBeGreaterThanOrEqual(0);
    t.clock.advance(ms);
    owner = await again(t, owner);
    renter = await again(t, renter);
  };
  /** Moves the clock to the next `hour`:30 in Riga and returns that day: `on(n, h)` is then `h`:30 on day n. */
  const startAt = async (hour: number) => {
    const today = day(t, 0);
    const first = rigaAt(today, hour) >= t.clock.now() ? today : day(t, 1);
    await moveTo(rigaAt(first, hour));
    return (offset: number, h: number) => rigaAt(addDays(localDate(first), offset), h);
  };

  /** A deal paid now, for the days `from`…`to` from today. */
  async function paid(from: number, to: number): Promise<string> {
    const listing = await seedListing(t, owner.user, { status: 'PUBLISHED' });
    const booking = await requestBooking(t, renter, listing.id, from, to);
    await step(owner, booking.id, { type: 'ACCEPT' });
    await step(renter, booking.id, { type: 'SIGN' });
    await step(owner, booking.id, { type: 'SIGN' });
    await step(renter, booking.id, { type: 'PAY', method: 'CARD', cardToken: await cardToken(renter) });
    return booking.id;
  }

  /** Who got the reminder `event`, by user id. */
  const reminded = async (event: string) => (await t.prisma.notification.findMany({ where: { event } })).map((n) => n.userId).sort();

  it('reminds both people the day before the handover and before the last day, from 10:00, once each', async () => {
    const on = await startAt(8);
    const id = await paid(2, 4);
    const both = [owner.user.id, renter.user.id].sort();
    t.mail.sent.length = 0;

    await moveTo(on(1, 9)); // the day before the first day, but too early
    expect((await timers.runDue()).reminders).toBe(0);
    await moveTo(on(1, 10));
    expect((await timers.runDue()).reminders).toBe(1);
    expect(await reminded('REMINDER_START')).toEqual(both);
    await t.mailSent();
    expect(t.mail.to(renter.email).map((m) => m.subject)).toEqual([expect.stringMatching(/^Tomorrow you pick up “.+”$/)]);
    expect(t.mail.to(owner.email).map((m) => m.subject)).toEqual([expect.stringMatching(/^Tomorrow you hand over “.+”$/)]);
    expect(t.mail.to(owner.email)[0]!.html).toContain(`/bookings/${id}`);
    expect((await timers.runDue()).reminders).toBe(0); // once
    expect(await reminded('REMINDER_START')).toEqual(both);

    await moveTo(on(2, 10)); // the first day: the handover
    await step(owner, id, { type: 'MARK_HANDED_OVER' });
    await step(renter, id, { type: 'CONFIRM_RECEIVED' });
    expect((await timers.runDue()).reminders).toBe(0); // the last day is the day after tomorrow
    const before = await t.prisma.booking.findUniqueOrThrow({ where: { id } });
    await moveTo(on(3, 10)); // the day before the last day
    expect((await timers.runDue()).reminders).toBe(1);
    expect(await reminded('REMINDER_END')).toEqual(both);
    expect((await timers.runDue()).reminders).toBe(0);
    // A reminder is not a step: the deal's version and last change stay as they were.
    const after = await t.prisma.booking.findUniqueOrThrow({ where: { id } });
    expect(after).toMatchObject({ status: 'ACTIVE', version: before.version, updatedAt: before.updatedAt });
    expect(after.endRemindedAt).toEqual(t.clock.now());
  });

  it("nudges whoever's turn it is when a request or a booking expires in less than 6 hours, once per turn", async () => {
    const later = async (hours: number) => {
      t.clock.advance(hours * HOUR);
      owner = await again(t, owner);
      renter = await again(t, renter);
    };
    const listing = await seedListing(t, owner.user, { status: 'PUBLISHED' });
    const { id } = await requestBooking(t, renter, listing.id, 5, 6); // the owner has 24 hours to answer

    await later(17); // 7 hours left
    expect((await timers.runDue()).reminders).toBe(0);
    await later(1.5); // 5.5 hours left
    expect((await timers.runDue()).reminders).toBe(1);
    expect(await reminded('REMINDER_ANSWER')).toEqual([owner.user.id]);
    expect((await timers.runDue()).reminders).toBe(0); // once per turn

    await later(0.5);
    await step(owner, id, { type: 'ACCEPT' }); // the renter has 24 hours to sign and pay
    await later(19); // 5 hours left
    expect((await timers.runDue()).reminders).toBe(1);
    expect(await reminded('REMINDER_PAY')).toEqual([renter.user.id]);

    await later(0.5);
    await step(renter, id, { type: 'SIGN' }); // now the owner countersigns
    expect((await timers.runDue()).reminders).toBe(0); // a turn first waits 2 hours
    await later(2);
    expect((await timers.runDue()).reminders).toBe(1);
    expect(await reminded('REMINDER_SIGN')).toEqual([owner.user.id]);
    expect((await timers.runDue()).reminders).toBe(0);

    await t.mailSent();
    expect(t.mail.to(owner.email).map((m) => m.subject)).toEqual(
      expect.arrayContaining([expect.stringMatching(/^The request for “.+” expires soon$/), expect.stringMatching(/^Sign the contract for “.+”$/)]),
    );
    expect(t.mail.to(renter.email).map((m) => m.subject)).toEqual(expect.arrayContaining([expect.stringMatching(/^Finish booking “.+”$/)]));
  });

  it('asks the sides of a completed deal that have not reviewed it how it went, 3 days after, once', async () => {
    const id = await returnedDeal(t, owner, renter);
    await step(owner, id, { type: 'ALL_FINE' });
    await renter.post(`/bookings/${id}/reviews`).send({ rating: 5, itemRating: 5, text: 'Great camera, an easy handover.' }).expect(201);

    await moveTo(new Date(t.clock.now().getTime() + 71 * HOUR));
    expect((await timers.runDue()).reminders).toBe(0); // not before three days
    await moveTo(new Date(t.clock.now().getTime() + HOUR + 60_000));
    const hour = rigaHour(t.clock.now()); // and only between 10:00 and 21:00
    if (hour < 10) await moveTo(rigaAt(day(t, 0), 10));
    if (hour >= 21) {
      expect((await timers.runDue()).reminders).toBe(0);
      await moveTo(rigaAt(day(t, 1), 10));
    }
    expect((await timers.runDue()).reminders).toBe(1);
    expect(await reminded('REMINDER_REVIEW')).toEqual([owner.user.id]); // the renter has written theirs
    expect((await timers.runDue()).reminders).toBe(0);
    await t.mailSent();
    expect(t.mail.to(owner.email).map((m) => m.subject)).toEqual(expect.arrayContaining([expect.stringMatching(/^How did renting “.+” go\?$/)]));
  });

  it('does not remind a deal paid the evening before (the payment just told them) or one that was cancelled', async () => {
    const on = await startAt(16);
    await paid(1, 2);
    const cancelled = await paid(3, 5);
    await step(renter, cancelled, { type: 'CANCEL', reason: 'Plans changed.' });
    expect((await timers.runDue()).reminders).toBe(0);
    await moveTo(on(0, 23)); // still that evening, seven hours after paying
    expect((await timers.runDue()).reminders).toBe(0);
    await moveTo(on(2, 10)); // the day before the cancelled deal's first day
    expect((await timers.runDue()).reminders).toBe(0);
    expect(await t.prisma.notification.count({ where: { event: { startsWith: 'REMINDER_' } } })).toBe(0);
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
