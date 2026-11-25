import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetAccounts, resetDeals } from './support/db';
import { again, cardToken, day, requestBooking, step } from './support/deals';
import { resetListings, seedListing, signedInClient, type Client } from './support/listings';
import { createTestApp, type TestApp } from './support/test-app';

/**
 * A new account's first days without the fee (owner, 2026-11-26: the first month after sign-up, instead of
 * a launch offer for everyone). The fee is decided when the renter sends the request and never changes.
 */
let t: TestApp;
let owner: Client;
let renter: Client;

const DAY = 86_400_000;

beforeAll(async () => {
  t = await createTestApp();
});

afterAll(async () => {
  // The database is shared with the other files: leave the fee settings as they were.
  await t.prisma.setting.deleteMany({ where: { key: { startsWith: 'fees.' } } });
  await t.close();
});

beforeEach(async () => {
  await resetDeals(t.prisma);
  await resetListings(t);
  await resetAccounts(t.prisma);
  await t.prisma.setting.deleteMany({ where: { key: { startsWith: 'fees.' } } });
  owner = await signedInClient(t, { name: 'Andris' });
  renter = await signedInClient(t, { name: 'Anna' });
});

const setting = (key: string, value: unknown) =>
  t.prisma.setting.upsert({ where: { key }, create: { key, value: value as never }, update: { value: value as never } });

/** The renter signed up `daysAgo` days before the test clock's now; 30 free days are on. */
async function newRenter(daysAgo: number) {
  await setting('fees.welcomeDays', 30);
  await t.prisma.user.update({ where: { id: renter.user.id }, data: { createdAt: new Date(t.clock.now().getTime() - daysAgo * DAY) } });
  renter = await again(t, renter);
  return seedListing(t, owner.user, { status: 'PUBLISHED' });
}

describe("a new account's first days without the fee", () => {
  it('prices a request within them at 0 % and says until when; a visitor sees the regular fee', async () => {
    const listing = await newRenter(2);
    const terms = (await request(t.server).get(`/api/v1/listings/${listing.id}/booking-terms`).expect(200)).body;
    expect(terms).toMatchObject({ servicePercent: 10, servicePromoUntil: null, regularServicePercent: 10, welcomeFeeDays: 30 });

    const booking = await requestBooking(t, renter, listing.id, 3, 5);
    expect(booking.quote).toMatchObject({ servicePercent: 0, serviceFeeCents: 0, servicePromoUntil: day(t, 28), totalCents: 4_500 + 5_000 });
  });

  it('charges the regular 10 % to an account older than the free days', async () => {
    const listing = await newRenter(31);
    const booking = await requestBooking(t, renter, listing.id, 4, 5);
    expect(booking.quote).toMatchObject({ servicePercent: 10, serviceFeeCents: 300, servicePromoUntil: null });
  });

  it('keeps the frozen fee when the free days end and the settings change before the deal is paid', async () => {
    // 29.9 days in: the free days end 2.4 hours later, well within the payment deadline.
    const listing = await newRenter(29.9);
    const booking = (await requestBooking(t, renter, listing.id, 4, 6)) as unknown as { id: string; quote: { servicePromoUntil: string } };
    expect(booking.quote).toMatchObject({ servicePercent: 0 });
    await step(owner, booking.id, { type: 'ACCEPT' });
    // The free days end and the administrator raises the fee and turns them off.
    t.clock.advance(3 * 3_600_000);
    await setting('fees.servicePercent', 25);
    await setting('fees.welcomeDays', 0);
    owner = await again(t, owner);
    renter = await again(t, renter);
    await step(renter, booking.id, { type: 'SIGN' });
    await step(owner, booking.id, { type: 'SIGN' });
    const paid = await step(renter, booking.id, { type: 'PAY', method: 'CARD', cardToken: await cardToken(renter) });
    expect(paid).toMatchObject({ status: 'PAID', quote: { servicePercent: 0, serviceFeeCents: 0, totalCents: 4_500 + 5_000, servicePromoUntil: booking.quote.servicePromoUntil } });
    const revenue = await t.prisma.ledgerAccount.findUnique({ where: { id: 'platform:revenue' } });
    expect(revenue?.balance ?? 0).toBe(0);
  });
});
