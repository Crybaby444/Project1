import 'reflect-metadata';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetAccounts, resetDeals } from './support/db';
import { resetListings, seedListing, signedInClient, type Client } from './support/listings';
import { createTestApp, type TestApp } from './support/test-app';

describe('complaints about items, people and messages (spec §5)', () => {
  let t: TestApp;
  let owner: Client;
  let renter: Client;
  let admin: Client;

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
    admin = await signedInClient(t, { name: 'Ada', role: 'ADMIN' });
  });

  afterAll(async () => {
    await t.close();
  });

  it('takes a complaint about an item once, never about your own, and needs words for "other"', async () => {
    const listing = await seedListing(t, owner.user, { status: 'PUBLISHED', title: 'Suspicious drill' });
    await request(t.server).post('/api/v1/reports').send({ target: 'LISTING', id: listing.id, reason: 'SCAM' }).expect(401);
    await renter.post('/reports').send({ target: 'LISTING', id: listing.id, reason: 'SCAM', note: 'Asks to pay outside Yoyo' }).expect(201);
    await renter.post('/reports').send({ target: 'LISTING', id: listing.id, reason: 'SCAM' }).expect(409);
    await owner.post('/reports').send({ target: 'LISTING', id: listing.id, reason: 'SCAM' }).expect(409);
    await renter.post('/reports').send({ target: 'USER', id: owner.user.id, reason: 'OTHER', note: '' }).expect(400);
    await renter.post('/reports').send({ target: 'LISTING', id: 'nope', reason: 'SCAM' }).expect(404);
  });

  it('takes a complaint about a message only from a side of that conversation', async () => {
    const listing = await seedListing(t, owner.user, { status: 'PUBLISHED' });
    const { conversation } = (await renter.post(`/listings/${listing.id}/conversation`).expect(200)).body;
    const { message } = (await owner.post(`/conversations/${conversation.id}/messages`).send({ text: 'Pay me on Revolut instead' }).expect(201)).body;
    const stranger = await signedInClient(t, { name: 'Sam' });
    await stranger.post('/reports').send({ target: 'MESSAGE', id: message.id, reason: 'SCAM' }).expect(404);
    await renter.post('/reports').send({ target: 'MESSAGE', id: message.id, reason: 'SCAM' }).expect(201);
  });

  it('queues complaints for administrators with what they are about, and closes them with a note', async () => {
    const listing = await seedListing(t, owner.user, { status: 'PUBLISHED', title: 'Suspicious drill' });
    await renter.post('/reports').send({ target: 'LISTING', id: listing.id, reason: 'PROHIBITED', note: 'Looks stolen' }).expect(201);
    await renter.get('/admin/reports').expect(403);
    const queue = (await admin.get('/admin/reports').expect(200)).body;
    expect(queue.total).toBe(1);
    expect(queue.items[0]).toMatchObject({ target: 'LISTING', reason: 'PROHIBITED', note: 'Looks stolen', status: 'OPEN', reporter: { name: 'Rita' }, subject: { id: listing.id, label: 'Suspicious drill', userId: owner.user.id } });
    expect((await admin.get('/admin/overview').expect(200)).body.reports).toEqual({ open: 1 });
    await admin.post(`/admin/reports/${queue.items[0].id}/close`).send({ status: 'RESOLVED', resolution: 'Listing hidden' }).expect(200);
    expect((await admin.get('/admin/reports').expect(200)).body.total).toBe(0);
    const closed = (await admin.get('/admin/reports?status=RESOLVED').expect(200)).body.items[0];
    expect(closed).toMatchObject({ status: 'RESOLVED', resolution: 'Listing hidden' });
    await admin.post(`/admin/reports/${queue.items[0].id}/close`).send({ status: 'DISMISSED', resolution: 'again' }).expect(409);
  });
});
