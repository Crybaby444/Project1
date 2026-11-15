import 'reflect-metadata';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetAccounts, resetDeals } from './support/db';
import { requestBooking } from './support/deals';
import { resetListings, seedListing, signedInClient, type Client } from './support/listings';
import { createTestApp, type TestApp } from './support/test-app';

describe('admin search (⌘K)', () => {
  let t: TestApp;
  let admin: Client;
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
    admin = await signedInClient(t, { name: 'Ada', role: 'ADMIN' });
    owner = await signedInClient(t, { name: 'Olga Kalniņa' });
    renter = await signedInClient(t, { name: 'Rita' });
  });

  afterAll(async () => {
    await t.close();
  });

  it('finds people by name or email, items by title, and deals by id or item, for admins only', async () => {
    const listing = await seedListing(t, owner.user, { status: 'PUBLISHED', title: 'Kärcher K5 washer' });
    const booking = await requestBooking(t, renter, listing.id, 1, 3);
    await owner.get('/admin/search?q=olga').expect(403);
    const byName = (await admin.get('/admin/search?q=kalnina').expect(200)).body;
    expect(byName.users.map((u: { name: string }) => u.name)).toEqual(['Olga Kalniņa']);
    const byItem = (await admin.get('/admin/search?q=karcher').expect(200)).body;
    expect(byItem.listings[0]).toMatchObject({ id: listing.id, owner: 'Olga Kalniņa' });
    expect(byItem.deals[0]).toMatchObject({ id: booking.id, renter: 'Rita' });
    const byId = (await admin.get(`/admin/search?q=${booking.id.slice(0, 8)}`).expect(200)).body;
    expect(byId.deals.map((d: { id: string }) => d.id)).toContain(booking.id);
    const byEmail = (await admin.get(`/admin/search?q=${encodeURIComponent(renter.email)}`).expect(200)).body;
    expect(byEmail.users[0]).toMatchObject({ name: 'Rita' });
    await admin.get('/admin/search?q=a').expect(400);
  });
});
