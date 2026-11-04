import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetAccounts, resetDeals } from './support/db';
import { again, day, requestBooking, step } from './support/deals';
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

/** 15 € a day, 10 % off from 7 days, 50 € deposit, 1–14 days (seedListing's defaults). */
const published = () => seedListing(t, owner.user, { status: 'PUBLISHED' });

describe('GET /listings/:id/quote', () => {
  it('prices the days with the domain rules, for anyone', async () => {
    const listing = await published();
    const res = await request(t.server).get(`/api/v1/listings/${listing.id}/quote?start=${day(t, 2)}&end=${day(t, 9)}`).expect(200);
    expect(res.body).toEqual({
      quote: {
        days: 8,
        dailyCents: 1500,
        baseCents: 12_000,
        discountPercent: 10,
        discountCents: 1_200,
        rentCents: 10_800,
        serviceFeeCents: 1_080,
        depositCents: 5_000,
        totalCents: 16_880,
        ownerPayoutCents: 10_800,
        priceSource: 'LISTED',
      },
      blocked: [],
    });
  });

  it('answers 404 for a listing that is not in the catalog', async () => {
    const hidden = await seedListing(t, owner.user, { status: 'HIDDEN' });
    await request(t.server).get(`/api/v1/listings/${hidden.id}/quote?start=${day(t, 2)}&end=${day(t, 3)}`).expect(404);
  });
});

describe('POST /bookings', () => {
  it('creates a request the owner has to answer', async () => {
    const listing = await published();
    const res = await renter.post('/bookings').send({ listingId: listing.id, start: day(t, 2), end: day(t, 9), message: '<b>Hi!</b> For a shelf.' });
    expect(res.status).toBe(201);
    const booking = res.body.booking;
    expect(booking).toMatchObject({
      status: 'REQUESTED',
      viewerRole: 'RENTER',
      listing: { id: listing.id, title: 'Bosch cordless drill', district: 'Centrs' },
      renter: { id: renter.user.id, name: 'Anna' },
      owner: { id: owner.user.id, name: 'Andris' },
      period: { start: day(t, 2), end: day(t, 9) },
      message: 'Hi! For a shelf.',
      quote: { rentCents: 10_800, serviceFeeCents: 1_080, totalCents: 16_880 },
      deadline: { timer: 'REQUEST_EXPIRY', dueAt: new Date(t.clock.now().getTime() + 24 * 3_600_000).toISOString() },
      actions: ['WITHDRAW'],
      hasContract: false,
      version: 0,
    });
    const asOwner = (await owner.get(`/bookings/${booking.id}`).expect(200)).body.booking;
    expect(asOwner).toMatchObject({ viewerRole: 'OWNER', actions: ['ACCEPT', 'DECLINE'] });
    const events = await t.prisma.bookingEvent.findMany({ where: { bookingId: booking.id } });
    expect(events).toMatchObject([{ type: 'REQUEST', actorKind: 'RENTER', actorId: renter.user.id, fromStatus: null, toStatus: 'REQUESTED', messages: ['REQUESTED'] }]);
  });

  it('lists the deals of each side', async () => {
    const listing = await published();
    const booking = await requestBooking(t, renter, listing.id, 2, 3);
    expect((await renter.get('/me/bookings?role=renter').expect(200)).body).toMatchObject({ items: [{ id: booking.id }], total: 1 });
    expect((await renter.get('/me/bookings?role=owner').expect(200)).body).toEqual({ items: [], total: 0 });
    expect((await owner.get('/me/bookings?role=owner&status=REQUESTED').expect(200)).body.total).toBe(1);
    expect((await owner.get('/me/bookings?role=owner&status=PAID').expect(200)).body.total).toBe(0);
  });

  it('is a deal only its two sides see', async () => {
    const listing = await published();
    const booking = await requestBooking(t, renter, listing.id, 2, 3);
    const stranger = await signedInClient(t);
    expect((await stranger.get(`/bookings/${booking.id}`).expect(404)).body.error.code).toBe('NOT_FOUND');
    const admin = await signedInClient(t, { role: 'ADMIN' });
    expect((await admin.get(`/bookings/${booking.id}`).expect(200)).body.booking).toMatchObject({ viewerRole: 'ADMIN', actions: [] });
  });

  it('refuses the owner renting their own item', async () => {
    const listing = await published();
    const res = await owner.post('/bookings').send({ listingId: listing.id, start: day(t, 2), end: day(t, 3) });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CANNOT_RENT_OWN');
  });

  it('checks the days with the domain rules', async () => {
    const listing = await published();
    const past = await renter.post('/bookings').send({ listingId: listing.id, start: day(t, -1), end: day(t, 2) });
    expect(past.status).toBe(400);
    expect(past.body.error).toMatchObject({ code: 'VALIDATION_FAILED', fields: { start: expect.any(String) }, details: { reason: 'START_IN_PAST' } });
    const long = await renter.post('/bookings').send({ listingId: listing.id, start: day(t, 1), end: day(t, 20) });
    expect(long.body.error).toMatchObject({ fields: { end: expect.any(String) }, details: { reason: 'PERIOD_TOO_LONG' } });
    const noDay = await renter.post('/bookings').send({ listingId: listing.id, start: '2027-02-30', end: '2027-03-02' });
    expect(noDay.status).toBe(400);
  });

  it('refuses days the owner closed', async () => {
    const listing = await published();
    await t.prisma.unavailability.create({
      data: { listingId: listing.id, start: new Date(`${day(t, 3)}T00:00:00Z`), end: new Date(`${day(t, 4)}T00:00:00Z`) },
    });
    const res = await renter.post('/bookings').send({ listingId: listing.id, start: day(t, 2), end: day(t, 5) });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ code: 'DATES_UNAVAILABLE', details: { conflict: { start: day(t, 3), end: day(t, 4) } } });
  });

  it('refuses a listing that is not in the catalog, and hides one that never was', async () => {
    const hidden = await seedListing(t, owner.user, { status: 'HIDDEN' });
    const res = await renter.post('/bookings').send({ listingId: hidden.id, start: day(t, 2), end: day(t, 3) });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('LISTING_UNAVAILABLE');
    const draft = await seedListing(t, owner.user);
    await renter.post('/bookings').send({ listingId: draft.id, start: day(t, 2), end: day(t, 3) }).expect(404);
    await renter.post('/bookings').send({ listingId: 'nope', start: day(t, 2), end: day(t, 3) }).expect(404);
  });

  it('refuses a listing of a blocked or deleted owner (review of PR #3)', async () => {
    const listing = await published();
    await t.prisma.user.update({ where: { id: owner.user.id }, data: { blockedAt: t.clock.now(), blockedReason: 'spam' } });
    const blocked = await renter.post('/bookings').send({ listingId: listing.id, start: day(t, 2), end: day(t, 3) });
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.code).toBe('LISTING_UNAVAILABLE');
    await request(t.server).get(`/api/v1/listings/${listing.id}/quote?start=${day(t, 2)}&end=${day(t, 3)}`).expect(404);
    await t.prisma.user.update({ where: { id: owner.user.id }, data: { blockedAt: null, deletedAt: t.clock.now() } });
    expect((await renter.post('/bookings').send({ listingId: listing.id, start: day(t, 2), end: day(t, 3) })).body.error.code).toBe(
      'LISTING_UNAVAILABLE',
    );
  });

  it('keeps one open request per renter and listing', async () => {
    const listing = await published();
    const first = await requestBooking(t, renter, listing.id, 2, 3);
    const again = await renter.post('/bookings').send({ listingId: listing.id, start: day(t, 5), end: day(t, 6) });
    expect(again.status).toBe(409);
    expect(again.body.error).toMatchObject({ code: 'ACTION_NOT_ALLOWED', details: { why: 'OPEN_REQUEST', bookingId: first.id } });
    await step(renter, first.id, { type: 'WITHDRAW' });
    await requestBooking(t, renter, listing.id, 5, 6);
  });

  it('allows 20 requests an hour and 30 a day per renter', async () => {
    const listings = [];
    for (let i = 0; i < 31; i++) listings.push(await published());
    for (let i = 0; i < 20; i++) await requestBooking(t, renter, listings[i]!.id, 2, 3);
    await renter.post('/bookings').send({ listingId: listings[20]!.id, start: day(t, 2), end: day(t, 3) }).expect(429);
    t.clock.advance(3_600_000 + 1);
    renter = await again(t, renter);
    for (let i = 20; i < 30; i++) await requestBooking(t, renter, listings[i]!.id, 2, 3);
    await renter.post('/bookings').send({ listingId: listings[30]!.id, start: day(t, 2), end: day(t, 3) }).expect(429);
  });
});
