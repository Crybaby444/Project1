import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetAccounts, resetDeals } from './support/db';
import { cardToken, day, requestBooking, step, topUp } from './support/deals';
import { resetListings, seedListing, signedInClient, type Client } from './support/listings';
import { createTestApp, type TestApp } from './support/test-app';

/** The reads the deal and wallet screens (plan 8b) need on top of plan 8. */
let t: TestApp;
let owner: Client;
let renter: Client;
let stranger: Client;

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
  stranger = await signedInClient(t, { name: 'Pēteris' });
});

/** 15 € a day, 10 % off from 7 days, 50 € deposit, 1–14 days (seedListing's defaults). */
const published = () => seedListing(t, owner.user, { status: 'PUBLISHED' });

/** A deal taken to PAID from the wallet. */
async function paidDeal(listingId: string) {
  await topUp(renter, 20_000);
  const booking = await requestBooking(t, renter, listingId, 1, 3);
  await step(owner, booking.id, { type: 'ACCEPT' });
  await step(owner, booking.id, { type: 'SIGN' });
  await step(renter, booking.id, { type: 'SIGN' });
  return step(renter, booking.id, { type: 'PAY', method: 'WALLET' });
}

describe('GET /listings/:id/booking-terms', () => {
  it('gives anyone the inputs of the domain quote, matching the API quote', async () => {
    const listing = await published();
    const terms = (await request(t.server).get(`/api/v1/listings/${listing.id}/booking-terms`).expect(200)).body;
    expect(terms).toMatchObject({
      listing: { id: listing.id, title: listing.title, ownerId: owner.user.id, ownerName: 'Andris' },
      pricing: { dailyCents: 1500, weeklyDiscountPercent: 10, depositCents: 5000, minDays: 1, maxDays: 14 },
      servicePercent: 10,
      timeZone: 'Europe/Riga',
      today: day(t, 0),
      blocked: [],
    });
    expect(terms.listing.coverUrl).toEqual(expect.any(String));
    expect(terms.maxAdvanceDays).toBeGreaterThan(0);
  });

  it('lists the days another deal holds', async () => {
    const listing = await published();
    const booking = await requestBooking(t, renter, listing.id, 2, 4);
    await step(owner, booking.id, { type: 'ACCEPT' });
    const terms = (await request(t.server).get(`/api/v1/listings/${listing.id}/booking-terms`).expect(200)).body;
    expect(terms.blocked).toEqual([{ start: day(t, 2), end: day(t, 4) }]);
  });

  it('answers 409 for a hidden listing and 404 for a draft', async () => {
    const hidden = await seedListing(t, owner.user, { status: 'HIDDEN' });
    const res = await request(t.server).get(`/api/v1/listings/${hidden.id}/booking-terms`).expect(409);
    expect(res.body.error.code).toBe('LISTING_UNAVAILABLE');
    const draft = await seedListing(t, owner.user);
    await request(t.server).get(`/api/v1/listings/${draft.id}/booking-terms`).expect(404);
  });
});

describe('GET /bookings/:id/history', () => {
  it('lists the steps oldest first, without notes', async () => {
    const listing = await published();
    const booking = await requestBooking(t, renter, listing.id, 1, 2);
    await step(owner, booking.id, { type: 'ACCEPT' });
    await step(renter, booking.id, { type: 'SIGN' });
    const res = await renter.get(`/bookings/${booking.id}/history`).expect(200);
    expect(res.body.items.map((i: { type: string; actor: string; toStatus: string }) => [i.type, i.actor, i.toStatus])).toEqual([
      ['REQUEST', 'RENTER', 'REQUESTED'],
      ['ACCEPT', 'OWNER', 'ACCEPTED'],
      ['SIGN', 'RENTER', 'ACCEPTED'],
    ]);
    expect(res.body.items[0]).toEqual({ type: 'REQUEST', actor: 'RENTER', fromStatus: null, toStatus: 'REQUESTED', at: expect.any(String) });
    await owner.get(`/bookings/${booking.id}/history`).expect(200);
  });

  it('does not exist for anyone else', async () => {
    const listing = await published();
    const booking = await requestBooking(t, renter, listing.id, 1, 2);
    await stranger.get(`/bookings/${booking.id}/history`).expect(404);
    await request(t.server).get(`/api/v1/bookings/${booking.id}/history`).expect(401);
  });
});

describe('GET /me/bookings with a group, and the summary', () => {
  it('splits open and closed deals and counts the ones waiting for me', async () => {
    const a = await published();
    const b = await published();
    const open = await requestBooking(t, renter, a.id, 1, 2);
    const declined = await requestBooking(t, renter, b.id, 1, 2);
    await step(owner, declined.id, { type: 'DECLINE' });

    const ids = async (client: Client, query: string) =>
      ((await client.get(`/me/bookings?${query}`).expect(200)).body.items as { id: string }[]).map((i) => i.id);
    expect(await ids(renter, 'role=renter&group=open')).toEqual([open.id]);
    expect(await ids(renter, 'role=renter&group=closed')).toEqual([declined.id]);
    expect(await ids(owner, 'role=owner&group=open')).toEqual([open.id]);

    expect((await owner.get('/me/bookings/summary').expect(200)).body).toEqual({
      renter: { open: 0, needsAction: 0 },
      owner: { open: 1, needsAction: 1 },
    });
    // The renter can only withdraw: that is a step they may take, so it counts as theirs.
    expect((await renter.get('/me/bookings/summary').expect(200)).body).toEqual({
      renter: { open: 1, needsAction: 1 },
      owner: { open: 0, needsAction: 0 },
    });
  });
});

describe('GET /wallet', () => {
  it('shows the frozen deposit, the rent waiting for handover and what the owner earned', async () => {
    const listing = await published();
    const paid = (await paidDeal(listing.id)) as unknown as { id: string };
    // 3 days × 15 € = 45 €, fee 4,50 €, deposit 50 €.
    expect((await renter.get('/wallet').expect(200)).body).toEqual({
      balanceCents: 20_000 - 9_950,
      heldCents: 9_500,
      depositsCents: 5_000,
      incomingCents: 0,
      earnedCents: 0,
    });
    expect((await owner.get('/wallet').expect(200)).body).toMatchObject({ incomingCents: 4_500, earnedCents: 0 });

    await step(owner, paid.id, { type: 'MARK_HANDED_OVER' });
    await step(renter, paid.id, { type: 'CONFIRM_RECEIVED' });
    await step(renter, paid.id, { type: 'MARK_RETURNED' });
    await step(owner, paid.id, { type: 'CONFIRM_RETURNED' });
    await step(owner, paid.id, { type: 'ALL_FINE' });

    expect((await renter.get('/wallet').expect(200)).body).toMatchObject({ balanceCents: 20_000 - 4_950, depositsCents: 0, heldCents: 0 });
    expect((await owner.get('/wallet').expect(200)).body).toEqual({
      balanceCents: 4_500,
      heldCents: 0,
      depositsCents: 0,
      incomingCents: 0,
      earnedCents: 4_500,
    });
  });

  it("counts a card-paid deposit as frozen and names the deal's item in the history", async () => {
    const listing = await published();
    const booking = await requestBooking(t, renter, listing.id, 1, 2);
    await step(owner, booking.id, { type: 'ACCEPT' });
    await step(owner, booking.id, { type: 'SIGN' });
    await step(renter, booking.id, { type: 'SIGN' });
    const token = await cardToken(renter);
    await step(renter, booking.id, { type: 'PAY', method: 'CARD', cardToken: token });
    expect((await renter.get('/wallet').expect(200)).body).toMatchObject({ heldCents: 0, depositsCents: 5_000 });

    await step(owner, booking.id, { type: 'MARK_HANDED_OVER' });
    await step(renter, booking.id, { type: 'CONFIRM_RECEIVED' });
    const history = (await owner.get('/wallet/transactions').expect(200)).body;
    expect(history.items).toEqual([
      { id: expect.any(String), kind: 'RENT_RELEASE', amountCents: 3_000, bookingId: booking.id, listingTitle: listing.title, createdAt: expect.any(String) },
    ]);
  });
});
