import 'reflect-metadata';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetAccounts } from './support/db';
import { resetListings, seedListing, signedInClient, type Client } from './support/listings';
import { createTestApp, type TestApp } from './support/test-app';

describe('admin: fix any listing (owner, 2026-11-16: manage everything on the site)', () => {
  let t: TestApp;
  let admin: Client;
  let anna: Client;

  beforeAll(async () => {
    t = await createTestApp();
  });
  beforeEach(async () => {
    await resetListings(t);
    await resetAccounts(t.prisma);
    admin = await signedInClient(t, { role: 'ADMIN', staffRole: 'OWNER', name: 'Admin' });
    anna = await signedInClient(t, { name: 'Anna' });
  });
  afterAll(async () => {
    await t.close();
  });

  it('changes the text and prices of a live listing, keeps it live, logs it and tells the owner', async () => {
    const listing = await seedListing(t, anna.user, { status: 'PUBLISHED', title: 'Drill with a typo', dailyCents: 1500 });
    const edited = (
      await admin
        .patch(`/admin/listings/${listing.id}`)
        .send({ version: listing.version, title: 'Bosch cordless drill', description: 'A Bosch drill with two batteries, a charger and a case of bits.', dailyCents: 1200, depositCents: 8000 })
        .expect(200)
    ).body.listing;
    expect(edited).toMatchObject({ title: 'Bosch cordless drill', dailyCents: 1200, depositCents: 8000, status: 'PUBLISHED' });
    expect(await t.prisma.adminAuditLog.count({ where: { action: 'LISTING_EDITED', targetId: listing.id } })).toBe(1);
    const bell = (await anna.get('/me/notifications').expect(200)).body.items;
    expect(bell[0]).toMatchObject({ kind: 'LISTING', event: 'EDITED', listingId: listing.id });
  });

  it('refuses a stale version and bad values, and is for staff only', async () => {
    const listing = await seedListing(t, anna.user, { status: 'PUBLISHED' });
    await admin.patch(`/admin/listings/${listing.id}`).send({ version: listing.version + 5, title: 'Something else here' }).expect(409);
    await admin.patch(`/admin/listings/${listing.id}`).send({ version: listing.version, dailyCents: -1 }).expect(400);
    await anna.patch(`/admin/listings/${listing.id}`).send({ version: listing.version, title: 'Mine anyway' }).expect(403);
  });
});
