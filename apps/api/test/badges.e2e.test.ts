import 'reflect-metadata';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetAccounts, resetDeals } from './support/db';
import { requestBooking } from './support/deals';
import { resetListings, seedListing, signedInClient, type Client } from './support/listings';
import { createTestApp, type TestApp } from './support/test-app';

describe('the header counts in one request (owner, 2026-11-28: 1000+ active people)', () => {
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

  it('answers a visitor 401', async () => {
    await request(t.server).get('/api/v1/me/badges').expect(401);
  });

  it('counts the bell, the messages and the deals that wait, the same as their own endpoints', async () => {
    const empty = { messages: 0, notifications: 0, deals: { renter: { open: 0, needsAction: 0 }, owner: { open: 0, needsAction: 0 } } };
    expect((await owner.get('/me/badges').expect(200)).body).toEqual(empty);

    const listing = await seedListing(t, owner.user, { status: 'PUBLISHED', title: 'Cordless drill' });
    await requestBooking(t, renter, listing.id, 1, 3);

    const badges = (await owner.get('/me/badges').expect(200)).body;
    expect(badges.notifications).toBe((await owner.get('/me/notifications/unread').expect(200)).body.count);
    expect(badges.notifications).toBeGreaterThan(0);
    expect(badges.deals).toEqual((await owner.get('/me/bookings/summary').expect(200)).body);
    expect(badges.deals.owner).toEqual({ open: 1, needsAction: 1 });
    expect(badges.messages).toBe((await owner.get('/me/conversations/unread?kind=direct').expect(200)).body.count);
  });
});
