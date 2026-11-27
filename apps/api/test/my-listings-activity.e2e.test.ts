import 'reflect-metadata';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetAccounts, resetDeals } from './support/db';
import { day, paidDeal, requestBooking } from './support/deals';
import { resetListings, seedListing, signedInClient, type Client } from './support/listings';
import { createTestApp, type TestApp } from './support/test-app';

describe('my listings: what is going on with each item', () => {
  let t: TestApp;
  let owner: Client;
  let renter: Client;

  beforeAll(async () => {
    t = await createTestApp();
  });

  beforeEach(async () => {
    await resetDeals(t.prisma);
    await resetListings(t);
    await resetAccounts(t.prisma);
    t.clock.advance(60 * 60_000);
    owner = await signedInClient(t, { name: 'Olga' });
    renter = await signedInClient(t, { name: 'Rita' });
  });

  afterAll(async () => {
    await t.close();
  });

  it('counts waiting requests, names the next confirmed rental and adds up what the item earned', async () => {
    const quiet = await seedListing(t, owner.user, { status: 'PUBLISHED', title: 'Quiet tent' });
    const busy = await seedListing(t, owner.user, { status: 'PUBLISHED', title: 'Busy drill' });
    await requestBooking(t, renter, busy.id, 10, 11);
    const paidId = await paidDeal(t, owner, renter, {});
    // paidDeal books a listing of its own; move that deal onto `busy` to have both on one item.
    await t.prisma.booking.update({ where: { id: paidId }, data: { listingId: busy.id } });
    const done = await requestBooking(t, renter, quiet.id, 20, 22);
    await t.prisma.booking.update({ where: { id: done.id }, data: { status: 'COMPLETED', completedAt: t.clock.now(), ownerPayoutCents: 4500 } });

    const items = (await owner.get('/me/listings').expect(200)).body.items as { title: string; activity: unknown }[];
    const of = (title: string) => items.find((i) => i.title === title)!.activity;
    expect(of('Busy drill')).toEqual({ requests: 1, offers: 0, nextStart: day(t, 1), earnedCents: 0 });
    expect(of('Quiet tent')).toEqual({ requests: 0, offers: 0, nextStart: null, earnedCents: 4500 });
  });

  it('counts the price offers waiting for an answer, not the answered ones', async () => {
    const drill = await seedListing(t, owner.user, { status: 'PUBLISHED', title: 'Drill' });
    const offer = async (from: number, to: number) =>
      (await renter.post(`/listings/${drill.id}/offers`).send({ start: day(t, from), end: day(t, to), dailyCents: 1200 }).expect(201)).body.offer;
    await offer(3, 4);
    const other = await signedInClient(t, { name: 'Ilze' });
    const declined = (await other.post(`/listings/${drill.id}/offers`).send({ start: day(t, 6), end: day(t, 7), dailyCents: 1100 }).expect(201)).body.offer;
    await owner.post(`/offers/${declined.id}/decline`).expect(200);
    const items = (await owner.get('/me/listings').expect(200)).body.items as { title: string; activity: { offers: number } }[];
    expect(items.find((i) => i.title === 'Drill')!.activity.offers).toBe(1);
  });
});
