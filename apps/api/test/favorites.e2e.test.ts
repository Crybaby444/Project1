import 'reflect-metadata';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetAccounts } from './support/db';
import { resetListings, seedListing, signedInClient, type Client } from './support/listings';
import { createTestApp, type TestApp } from './support/test-app';

describe('favourites', () => {
  let t: TestApp;
  let anna: Client;
  let boris: Client;

  beforeAll(async () => {
    t = await createTestApp();
  });

  beforeEach(async () => {
    await resetListings(t);
    await resetAccounts(t.prisma);
    t.clock.advance(60 * 60_000);
    anna = await signedInClient(t, { name: 'Anna' });
    boris = await signedInClient(t, { name: 'Boris' });
  });

  afterAll(async () => {
    await t.close();
  });

  it('adds and removes idempotently', async () => {
    const listing = await seedListing(t, boris.user, { status: 'PUBLISHED' });
    await anna.put(`/me/favorites/${listing.id}`).expect(204);
    await anna.put(`/me/favorites/${listing.id}`).expect(204);
    expect(await t.prisma.favorite.count()).toBe(1);
    expect((await anna.get('/me/favorites/ids').expect(200)).body).toEqual({ ids: [listing.id] });
    await anna.delete(`/me/favorites/${listing.id}`).expect(204);
    await anna.delete(`/me/favorites/${listing.id}`).expect(204);
    expect((await anna.get('/me/favorites/ids').expect(200)).body).toEqual({ ids: [] });
  });

  it('needs a session, and only items the catalog shows', async () => {
    const draft = await seedListing(t, boris.user, { status: 'DRAFT' });
    await request(t.server).put(`/api/v1/me/favorites/${draft.id}`).expect(401);
    await anna.put(`/me/favorites/${draft.id}`).expect(404);
    await anna.put('/me/favorites/nope').expect(404);
  });

  it('keeps a favourite that left the catalog as unavailable, without its price or photo', async () => {
    const listing = await seedListing(t, boris.user, { status: 'PUBLISHED' });
    const other = await seedListing(t, boris.user, { status: 'PUBLISHED', title: 'Second item to rent' });
    await anna.put(`/me/favorites/${listing.id}`).expect(204);
    t.clock.advance(1000);
    await anna.put(`/me/favorites/${other.id}`).expect(204);
    await t.prisma.listing.update({ where: { id: listing.id }, data: { status: 'HIDDEN' } });

    expect((await anna.get('/me/favorites/ids').expect(200)).body.ids).toEqual([other.id]);
    const { items } = (await anna.get('/me/favorites').expect(200)).body;
    expect(items.map((i: { id: string; available: boolean }) => [i.id, i.available])).toEqual([
      [other.id, true],
      [listing.id, false],
    ]);
    expect(items[1]).toMatchObject({ cover: null, dailyCents: 0, title: 'Bosch cordless drill' });
    expect(JSON.stringify(items)).not.toMatch(/"lat"|"lng"/);
  });

  it('keeps each person’s favourites to themselves, and limits changes', async () => {
    const listing = await seedListing(t, boris.user, { status: 'PUBLISHED' });
    await anna.put(`/me/favorites/${listing.id}`).expect(204);
    expect((await boris.get('/me/favorites/ids').expect(200)).body.ids).toEqual([]);
    for (let i = 0; i < 119; i++) await anna.delete(`/me/favorites/${listing.id}`);
    expect((await anna.delete(`/me/favorites/${listing.id}`)).status).toBe(429);
  });
});
