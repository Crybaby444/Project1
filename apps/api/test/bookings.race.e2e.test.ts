import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetAccounts, resetDeals } from './support/db';
import { day, newKey, requestBooking } from './support/deals';
import { resetListings, seedListing, signedInClient } from './support/listings';
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
  await resetListings(t);
  await resetAccounts(t.prisma);
});

describe('double booking', () => {
  it('lets exactly one of ten parallel ACCEPTs of overlapping requests through', async () => {
    const owner = await signedInClient(t);
    const listing = await seedListing(t, owner.user, { status: 'PUBLISHED' });
    const requests = [];
    for (let i = 0; i < 10; i++) {
      const renter = await signedInClient(t);
      // Each overlaps the others: days 3–5 shifted by up to two days.
      requests.push(await requestBooking(t, renter, listing.id, 3 + (i % 3), 5 + (i % 3)));
    }
    const results = await Promise.all(
      requests.map((booking) =>
        owner.post(`/bookings/${booking.id}/events`).set('Idempotency-Key', newKey()).send({ version: 0, event: { type: 'ACCEPT' } }),
      ),
    );
    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual([200, ...Array<number>(9).fill(409)]);
    for (const r of results.filter((res) => res.status === 409)) expect(r.body.error.code).toBe('DATES_UNAVAILABLE');
    const [row] = await t.prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*) AS count FROM "Booking" WHERE reserved IS NOT NULL`;
    expect(Number(row?.count)).toBe(1);
    expect(await t.prisma.booking.count({ where: { status: 'ACCEPTED' } })).toBe(1);
    expect(await t.prisma.contract.count()).toBe(1);
    expect(day(t, 3)).toBeTruthy();
  });
});
