import 'reflect-metadata';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetAccounts, resetDeals } from './support/db';
import { requestBooking } from './support/deals';
import { categoryId, resetListings, seedListing, signedInClient, type Client } from './support/listings';
import { createTestApp, type TestApp } from './support/test-app';

describe('shops and direct messages', () => {
  let t: TestApp;
  let olga: Client;
  let janis: Client;

  beforeAll(async () => {
    t = await createTestApp();
  });

  beforeEach(async () => {
    await resetDeals(t.prisma);
    await t.prisma.shop.deleteMany();
    await resetListings(t);
    await resetAccounts(t.prisma);
    t.clock.advance(60 * 60_000);
    olga = await signedInClient(t, { name: 'Olga Kalniņa' });
    janis = await signedInClient(t, { name: 'Jānis Ozols' });
  });

  afterAll(async () => {
    await t.close();
  });

  it('a person makes a shop of their own items; everyone sees it with the items the catalog shows', async () => {
    const drill = await seedListing(t, olga.user, { status: 'PUBLISHED', title: 'Drill' });
    const draft = await seedListing(t, olga.user, { status: 'DRAFT', title: 'Saw' });
    const foreign = await seedListing(t, janis.user, { status: 'PUBLISHED', title: 'Not hers' });
    await olga.post('/me/shops').send({ name: 'Workshop', listingIds: [foreign.id] }).expect(400);
    const shop = (await olga.post('/me/shops').send({ name: 'Workshop', about: 'Tools for the weekend', categoryId: await categoryId(t, 'tools'), listingIds: [draft.id, drill.id] }).expect(201)).body;
    expect(shop.listingIds).toEqual([draft.id, drill.id]);

    const publicShops = (await request(t.server).get(`/api/v1/users/${olga.user.id}/shops`).expect(200)).body.items;
    expect(publicShops).toEqual([expect.objectContaining({ id: shop.id, name: 'Workshop', itemCount: 1 })]);
    const page = (await request(t.server).get(`/api/v1/shops/${shop.id}`).expect(200)).body;
    expect(page.items.map((i: { id: string }) => i.id)).toEqual([drill.id]);
    expect(page.owner).toMatchObject({ id: olga.user.id, name: `@${olga.user.username}` });

    await janis.patch(`/me/shops/${shop.id}`).send({ name: 'Mine now' }).expect(404);
    await olga.patch(`/me/shops/${shop.id}`).send({ listingIds: [drill.id] }).expect(200);
    await olga.delete(`/me/shops/${shop.id}`).expect(204);
    await request(t.server).get(`/api/v1/shops/${shop.id}`).expect(404);
  });

  it('a profile opens one direct conversation per pair; Messages lists only those, the deal keeps its own', async () => {
    await janis.post(`/users/${janis.user.id}/conversation`).expect(409);
    const a = (await janis.post(`/users/${olga.user.id}/conversation`).expect(200)).body.conversation;
    const b = (await olga.post(`/users/${janis.user.id}/conversation`).expect(200)).body.conversation;
    expect(b.id).toBe(a.id);
    expect(a.listing).toBeNull();
    await janis.post(`/conversations/${a.id}/messages`).send({ text: 'Hi Olga!' }).expect(201);

    const listing = await seedListing(t, olga.user, { status: 'PUBLISHED' });
    const booking = await requestBooking(t, janis, listing.id, 2, 3);
    const dealChat = (await olga.get(`/bookings/${booking.id}/conversation`).expect(200)).body.conversation;
    expect(dealChat.listing.id).toBe(listing.id);
    await request(t.server).get(`/api/v1/bookings/${booking.id}/conversation`).expect(401);

    const direct = (await olga.get('/me/conversations?kind=direct').expect(200)).body.items;
    expect(direct.map((c: { id: string }) => c.id)).toEqual([a.id]);
    const deals = (await olga.get('/me/conversations?kind=deal').expect(200)).body.items;
    expect(deals.map((c: { id: string }) => c.id)).toEqual([dealChat.id]);
    expect((await olga.get('/me/conversations/unread?kind=direct').expect(200)).body.count).toBe(1);
  });
});
