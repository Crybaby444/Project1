import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetAccounts, resetDeals } from './support/db';
import { day } from './support/deals';
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

const published = () => seedListing(t, owner.user, { status: 'PUBLISHED' });

async function offer(listingId: string, dailyCents = 1200, from = 2, to = 4) {
  return renter.post(`/listings/${listingId}/offers`).send({ start: day(t, from), end: day(t, to), dailyCents });
}

describe('price offers', () => {
  it('lets the renter offer a lower daily price and the owner accept it', async () => {
    const listing = await published();
    const made = await offer(listing.id);
    expect(made.status).toBe(201);
    expect(made.body.offer).toMatchObject({
      status: 'PENDING',
      dailyCents: 1200,
      listedDailyCents: 1500,
      listing: { id: listing.id, title: 'Bosch cordless drill' },
      renter: { id: renter.user.id, name: 'Anna' },
    });
    expect((await owner.get('/me/offers?role=owner').expect(200)).body.items).toHaveLength(1);
    const accepted = await owner.post(`/offers/${made.body.offer.id}/accept`).expect(200);
    expect(accepted.body.offer.status).toBe('ACCEPTED');

    const booking = await renter.post('/bookings').send({ listingId: listing.id, start: day(t, 2), end: day(t, 4), offerId: made.body.offer.id });
    expect(booking.status).toBe(201);
    expect(booking.body.booking.quote).toMatchObject({ dailyCents: 1200, rentCents: 3600, priceSource: 'AGREED' });
    expect((await t.prisma.offer.findUniqueOrThrow({ where: { id: made.body.offer.id } })).status).toBe('USED');

    const again = await renter.post('/bookings').send({ listingId: listing.id, start: day(t, 2), end: day(t, 4), offerId: made.body.offer.id });
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('OFFER_UNAVAILABLE');
  });

  it('checks the offer with the domain rules', async () => {
    const listing = await published();
    const tooHigh = await offer(listing.id, 1500);
    expect(tooHigh.status).toBe(400);
    expect(tooHigh.body.error).toMatchObject({ fields: { dailyCents: expect.any(String) }, details: { reason: 'INVALID_OFFER' } });
    expect((await offer(listing.id, 99)).status).toBe(400);
    expect((await owner.post(`/listings/${listing.id}/offers`).send({ start: day(t, 2), end: day(t, 3), dailyCents: 1000 })).body.error.code).toBe(
      'CANNOT_RENT_OWN',
    );
  });

  it('only uses an accepted offer for its own days and renter', async () => {
    const listing = await published();
    const made = (await offer(listing.id)).body.offer;
    const pending = await renter.post('/bookings').send({ listingId: listing.id, start: day(t, 2), end: day(t, 4), offerId: made.id });
    expect(pending.body.error.code).toBe('OFFER_UNAVAILABLE');
    await owner.post(`/offers/${made.id}/accept`).expect(200);
    const otherDays = await renter.post('/bookings').send({ listingId: listing.id, start: day(t, 2), end: day(t, 5), offerId: made.id });
    expect(otherDays.body.error.code).toBe('OFFER_UNAVAILABLE');
    const stranger = await signedInClient(t);
    const notTheirs = await stranger.post('/bookings').send({ listingId: listing.id, start: day(t, 2), end: day(t, 4), offerId: made.id });
    expect(notTheirs.body.error.code).toBe('OFFER_UNAVAILABLE');
  });

  it('lets only the owner answer and only the renter withdraw', async () => {
    const listing = await published();
    const made = (await offer(listing.id)).body.offer;
    await renter.post(`/offers/${made.id}/accept`).expect(404);
    const stranger = await signedInClient(t);
    await stranger.post(`/offers/${made.id}/decline`).expect(404);
    await owner.post(`/offers/${made.id}/withdraw`).expect(404);
    expect((await owner.post(`/offers/${made.id}/decline`).expect(200)).body.offer.status).toBe('DECLINED');
    expect((await owner.post(`/offers/${made.id}/accept`).expect(409)).body.error.code).toBe('OFFER_UNAVAILABLE');
  });

  it('expires an unanswered offer after 24 hours', async () => {
    const listing = await published();
    const made = (await offer(listing.id, 1200, 5, 6)).body.offer;
    expect(made.expiresAt).toBe(new Date(t.clock.now().getTime() + 24 * 3_600_000).toISOString());
    // 24 hours later (moved in the row: moving the clock would also end the test sessions).
    await t.prisma.offer.update({ where: { id: made.id }, data: { expiresAt: new Date(t.clock.now().getTime() - 1) } });
    expect((await owner.post(`/offers/${made.id}/accept`).expect(409)).body.error.code).toBe('OFFER_UNAVAILABLE');
    expect((await renter.get('/me/offers?role=renter').expect(200)).body.items[0].status).toBe('EXPIRED');
  });

  it('refuses offers on a blocked owner\'s listing', async () => {
    const listing = await published();
    await t.prisma.user.update({ where: { id: owner.user.id }, data: { blockedAt: t.clock.now() } });
    expect((await offer(listing.id)).body.error.code).toBe('LISTING_UNAVAILABLE');
  });
});
