import 'reflect-metadata';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetAccounts, resetDeals } from './support/db';
import { day } from './support/deals';
import { resetListings, seedListing, signedInClient, type Client } from './support/listings';
import { createTestApp, type TestApp } from './support/test-app';

describe('demo listings (owner, 2026-11-16: examples on the live site, marked, never rented)', () => {
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
    owner = await signedInClient(t, { name: 'Demo Owner' });
    renter = await signedInClient(t, { name: 'Rita Renter' });
  });
  afterAll(async () => {
    await t.close();
  });

  it('shows the mark in the catalog and on the item page', async () => {
    const demo = await seedListing(t, owner.user, { status: 'PUBLISHED', demo: true });
    const real = await seedListing(t, owner.user, { status: 'PUBLISHED' });
    const items = (await request(t.server).get('/api/v1/catalog/listings').expect(200)).body.items as { id: string; demo: boolean }[];
    expect(items.find((i) => i.id === demo.id)?.demo).toBe(true);
    expect(items.find((i) => i.id === real.id)?.demo).toBe(false);
    expect((await request(t.server).get(`/api/v1/catalog/listings/${demo.id}`).expect(200)).body.item.demo).toBe(true);
  });

  it('cannot be booked, offered on or asked about', async () => {
    const demo = await seedListing(t, owner.user, { status: 'PUBLISHED', demo: true });
    const booking = await renter.post('/bookings').send({ listingId: demo.id, start: day(t, 2), end: day(t, 3) });
    expect(booking.status).toBe(409);
    expect(booking.body.error.code).toBe('DEMO_LISTING');
    const offer = await renter.post(`/listings/${demo.id}/offers`).send({ start: day(t, 2), end: day(t, 3), dailyCents: 500 });
    expect(offer.body.error.code).toBe('DEMO_LISTING');
    const chat = await renter.post(`/listings/${demo.id}/conversation`);
    expect(chat.body.error.code).toBe('DEMO_LISTING');
  });
});
