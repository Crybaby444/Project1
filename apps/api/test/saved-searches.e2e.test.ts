import 'reflect-metadata';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetAccounts, resetDeals } from './support/db';
import { categoryId, resetListings, seedListing, signedInClient, type Client } from './support/listings';
import { seedUser } from './support/users';
import { createTestApp, type TestApp } from './support/test-app';

describe('saved searches: hear about new items', () => {
  let t: TestApp;
  let seeker: Client;
  let owner: Client;
  let admin: Client;

  beforeAll(async () => {
    t = await createTestApp();
  });

  beforeEach(async () => {
    await resetDeals(t.prisma);
    await resetListings(t);
    await resetAccounts(t.prisma);
    t.clock.advance(60 * 60_000);
    seeker = await signedInClient(t, { name: 'Sam' });
    owner = await signedInClient(t, { name: 'Olga' });
    admin = await signedInClient(t, { name: 'Ada', role: 'ADMIN' });
    void seedUser;
  });

  afterAll(async () => {
    await t.close();
  });

  const approve = async (id: string) => {
    const { version } = await t.prisma.listing.findUniqueOrThrow({ where: { id } });
    await admin.post(`/admin/listings/${id}/approve`).send({ version }).expect(200);
  };

  it('saves, lists and deletes a search; refuses an empty one', async () => {
    const made = (await seeker.post('/me/saved-searches').send({ q: 'drill', priceMax: 2000 }).expect(201)).body.search;
    expect(made).toMatchObject({ q: 'drill', priceMax: 2000, category: null, district: null });
    await seeker.post('/me/saved-searches').send({}).expect(400);
    expect((await seeker.get('/me/saved-searches').expect(200)).body.items).toHaveLength(1);
    await owner.delete(`/me/saved-searches/${made.id}`).expect(404);
    await seeker.delete(`/me/saved-searches/${made.id}`).expect(204);
    expect((await seeker.get('/me/saved-searches').expect(200)).body.items).toHaveLength(0);
  });

  it('rings the bell when a matching item is published, and only then', async () => {
    await seeker.post('/me/saved-searches').send({ q: 'drill', priceMax: 2000 }).expect(201);
    const cheap = await seedListing(t, owner.user, { status: 'PENDING_REVIEW', title: 'Bosch cordless drill', dailyCents: 1500 });
    const pricey = await seedListing(t, owner.user, { status: 'PENDING_REVIEW', title: 'Hilti drill', dailyCents: 5000 });
    const other = await seedListing(t, owner.user, { status: 'PENDING_REVIEW', title: 'Camping tent', description: 'A tent for four people, easy to set up.', dailyCents: 1000, categoryId: await categoryId(t, 'pressure-washers'), attributes: {} });
    await approve(cheap.id);
    await approve(pricey.id);
    await approve(other.id);
    const items = (await seeker.get('/me/notifications').expect(200)).body.items;
    expect(items.map((n: { kind: string; listingId: string }) => [n.kind, n.listingId])).toEqual([['SEARCH', cheap.id]]);
    // The owner never hears about their own item.
    await owner.post('/me/saved-searches').send({ q: 'drill' }).expect(201);
    const mine = await seedListing(t, owner.user, { status: 'PENDING_REVIEW', title: 'Makita drill', dailyCents: 900 });
    await approve(mine.id);
    expect((await owner.get('/me/notifications').expect(200)).body.items.filter((n: { kind: string }) => n.kind === 'SEARCH')).toHaveLength(0);
  });
});
