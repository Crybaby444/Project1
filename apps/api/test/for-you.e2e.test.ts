import 'reflect-metadata';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetAccounts, resetDeals } from './support/db';
import { requestBooking } from './support/deals';
import { categoryId, resetListings, seedListing, signedInClient, type Client } from './support/listings';
import { createTestApp, type TestApp } from './support/test-app';

describe('For you (owner, 2026-11-16: by interests or popularity, not just the newest)', () => {
  let t: TestApp;
  let olga: Client;
  let rita: Client;

  beforeAll(async () => {
    t = await createTestApp();
  });
  beforeEach(async () => {
    await resetDeals(t.prisma);
    await resetListings(t);
    await resetAccounts(t.prisma);
    olga = await signedInClient(t, { name: 'Olga Owner' });
    rita = await signedInClient(t, { name: 'Rita Renter' });
  });
  afterAll(async () => {
    await t.close();
  });

  const ids = (body: { items: { id: string }[] }) => body.items.map((i) => i.id);

  it('ranks what people favour and ask to rent above what nobody looked at', async () => {
    const quiet = await seedListing(t, olga.user, { status: 'PUBLISHED', title: 'Quiet item nobody wants' });
    const loved = await seedListing(t, olga.user, { status: 'PUBLISHED', title: 'Loved item everyone wants' });
    t.clock.advance(60_000);
    for (let i = 0; i < 3; i++) {
      const fan = await signedInClient(t, { name: `Fan ${i}` });
      await fan.put(`/me/favorites/${loved.id}`).expect(204);
    }
    await requestBooking(t, rita, loved.id, 2, 3);
    const popular = (await request(t.server).get('/api/v1/catalog/for-you').query({ country: 'LV' }).expect(200)).body;
    expect(ids(popular).indexOf(loved.id)).toBeLessThan(ids(popular).indexOf(quiet.id));
  });

  it('puts the person’s own interests first and never their own items', async () => {
    const tents = await categoryId(t, 'tents');
    const drills = await categoryId(t, 'drills-drivers');
    const drill = await seedListing(t, olga.user, { status: 'PUBLISHED', categoryId: drills });
    const tent = await seedListing(t, olga.user, { status: 'PUBLISHED', categoryId: tents });
    const mine = await seedListing(t, rita.user, { status: 'PUBLISHED', categoryId: tents });
    // A visitor who looked at tents.
    const visitor = (await request(t.server).get('/api/v1/catalog/for-you').query({ country: 'LV', categories: tents }).expect(200)).body;
    expect(ids(visitor)[0]).toBe(tent.id);
    // Rita favours a tent: tents come first for her, and her own tent never shows.
    await rita.put(`/me/favorites/${tent.id}`).expect(204);
    const forRita = (await rita.get('/me/for-you').query({ country: 'LV' }).expect(200)).body;
    expect(ids(forRita)[0]).toBe(tent.id);
    expect(ids(forRita)).not.toContain(mine.id);
    expect(ids(forRita)).toContain(drill.id);
  });

  it('shows at most two items of one owner among the first eight', async () => {
    const many = await signedInClient(t, { name: 'Many Items' });
    for (let i = 0; i < 6; i++) await seedListing(t, many.user, { status: 'PUBLISHED' });
    for (let i = 0; i < 6; i++) await seedListing(t, (await signedInClient(t, { name: `Owner ${i}` })).user, { status: 'PUBLISHED' });
    const items = (await request(t.server).get('/api/v1/catalog/for-you').query({ country: 'LV' }).expect(200)).body.items as { ownerId: string }[];
    const firstEight = items.slice(0, 8);
    expect(firstEight.filter((i) => i.ownerId === many.user.id).length).toBeLessThanOrEqual(2);
    expect(items.length).toBeLessThanOrEqual(12);
  });
});
