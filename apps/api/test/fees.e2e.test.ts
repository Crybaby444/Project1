import { endOfDayIn, localDate } from '@yoyo/domain';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetAccounts, resetDeals } from './support/db';
import { again, cardToken, day, requestBooking, step } from './support/deals';
import { resetListings, seedListing, signedInClient, type Client } from './support/listings';
import { createTestApp, type TestApp } from './support/test-app';

/**
 * The service fee's launch offer (owner decision of 2026-11-06): 0 % until a configurable last day,
 * then 10 %. The fee is decided when the renter sends the request and never changes afterwards.
 */
let t: TestApp;
let owner: Client;
let renter: Client;

const HOUR = 3_600_000;

beforeAll(async () => {
  t = await createTestApp();
});

afterAll(async () => {
  // The database is shared with the browser tests in CI: leave the fee settings as they were.
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

/** 15 € a day, 50 € deposit (seedListing's defaults). The offer lasts through tomorrow, where the item is. */
async function withOffer() {
  await setting('fees.promoServicePercent', 0);
  await setting('fees.promoServiceUntil', day(t, 1));
  return seedListing(t, owner.user, { status: 'PUBLISHED' });
}

/** Moves the test clock to `ms` after the end of `date` in Riga (negative: before it). */
function toEndOf(date: string, ms: number) {
  const end = endOfDayIn(localDate(date), 'Europe/Riga').getTime();
  t.clock.advance(end + ms - t.clock.now().getTime());
}

describe('the launch offer on the service fee', () => {
  it('prices requests in the window at 0 % and says until when', async () => {
    const listing = await withOffer();
    const terms = (await request(t.server).get(`/api/v1/listings/${listing.id}/booking-terms`).expect(200)).body;
    expect(terms).toMatchObject({ servicePercent: 0, servicePromoUntil: day(t, 1), regularServicePercent: 10 });
    const quote = (await request(t.server).get(`/api/v1/listings/${listing.id}/quote?start=${day(t, 3)}&end=${day(t, 5)}`).expect(200)).body.quote;
    expect(quote).toMatchObject({ servicePercent: 0, serviceFeeCents: 0, servicePromoUntil: day(t, 1), totalCents: 4_500 + 5_000 });

    const booking = await requestBooking(t, renter, listing.id, 3, 5);
    expect(booking.quote).toMatchObject({ servicePercent: 0, serviceFeeCents: 0, servicePromoUntil: day(t, 1) });
  });

  it('charges the regular 10 % from the first moment after the last day, and not a millisecond earlier', async () => {
    const listing = await withOffer();
    toEndOf(day(t, 1), -1);
    owner = await again(t, owner);
    renter = await again(t, renter);
    const before = await requestBooking(t, renter, listing.id, 4, 5);
    expect(before.quote).toMatchObject({ servicePercent: 0, serviceFeeCents: 0 });

    t.clock.advance(1);
    const terms = (await request(t.server).get(`/api/v1/listings/${listing.id}/booking-terms`).expect(200)).body;
    expect(terms).toMatchObject({ servicePercent: 10, servicePromoUntil: null, regularServicePercent: 10 });
    const other = await seedListing(t, owner.user, { status: 'PUBLISHED' });
    const after = await requestBooking(t, renter, other.id, 4, 5);
    expect(after.quote).toMatchObject({ servicePercent: 10, serviceFeeCents: 300, servicePromoUntil: null });
  });

  it('keeps the frozen fee when the offer ends and the settings change before the deal is paid', async () => {
    const listing = await withOffer();
    const lastDay = day(t, 1);
    // Requested and accepted in the offer's last hours, paid after it (well within the payment deadline).
    toEndOf(lastDay, -2 * HOUR);
    owner = await again(t, owner);
    renter = await again(t, renter);
    const booking = (await requestBooking(t, renter, listing.id, 4, 6)) as unknown as { id: string; quote: { servicePromoUntil: string } };
    expect(booking.quote.servicePromoUntil).toBe(lastDay);
    await step(owner, booking.id, { type: 'ACCEPT' });
    // The offer ends and the administrator raises the regular fee.
    toEndOf(lastDay, HOUR);
    await setting('fees.servicePercent', 25);
    await setting('fees.promoServiceUntil', '');
    owner = await again(t, owner);
    renter = await again(t, renter);
    await step(owner, booking.id, { type: 'SIGN' });
    await step(renter, booking.id, { type: 'SIGN' });
    const paid = await step(renter, booking.id, { type: 'PAY', method: 'CARD', cardToken: await cardToken(renter) });
    expect(paid).toMatchObject({ status: 'PAID', quote: { servicePercent: 0, serviceFeeCents: 0, totalCents: 4_500 + 5_000, servicePromoUntil: booking.quote.servicePromoUntil } });
    const revenue = await t.prisma.ledgerAccount.findUnique({ where: { id: 'platform:revenue' } });
    expect(revenue?.balance ?? 0).toBe(0);
  });
});
