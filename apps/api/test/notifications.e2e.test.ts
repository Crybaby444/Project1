import 'reflect-metadata';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetAccounts, resetDeals } from './support/db';
import { requestBooking, step } from './support/deals';
import { resetListings, seedListing, signedInClient, type Client } from './support/listings';
import { createTestApp, type TestApp } from './support/test-app';

describe('bell notifications and email topics (plan 9, spec §4.7)', () => {
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
    t.mail.sent.length = 0;
    owner = await signedInClient(t, { name: 'Olga' });
    renter = await signedInClient(t, { name: 'Rita' });
  });

  afterAll(async () => {
    await t.close();
  });

  it('rings the bell with every deal step a side is told about, links it, and marks it read', async () => {
    const listing = await seedListing(t, owner.user, { status: 'PUBLISHED', title: 'Cordless drill' });
    const booking = await requestBooking(t, renter, listing.id, 1, 3);
    const mine = (await owner.get('/me/notifications').expect(200)).body;
    expect(mine.unread).toBe(1);
    expect(mine.items[0]).toMatchObject({ kind: 'DEAL', event: 'REQUESTED', bookingId: booking.id, title: 'Cordless drill', readAt: null });
    expect((await owner.get('/me/notifications/unread').expect(200)).body).toEqual({ count: 1 });

    await step(owner, booking.id, { type: 'ACCEPT' });
    const theirs = (await renter.get('/me/notifications').expect(200)).body;
    expect(theirs.items.map((n: { event: string }) => n.event)).toContain('ACCEPTED');

    await owner.post(`/me/notifications/${mine.items[0].id}/read`).expect(204);
    expect((await owner.get('/me/notifications/unread').expect(200)).body).toEqual({ count: 0 });
    await renter.post('/me/notifications/read').expect(204);
    expect((await renter.get('/me/notifications/unread').expect(200)).body).toEqual({ count: 0 });
    await renter.post(`/me/notifications/${mine.items[0].id}/read`).expect(404);
    await request(t.server).get('/api/v1/me/notifications').expect(401);
  });

  it('lets a person turn deal emails off; the bell still rings', async () => {
    expect((await owner.get('/me/email-preferences').expect(200)).body).toEqual({ off: [] });
    await owner.put('/me/email-preferences').send({ off: ['DEALS'] }).expect(200);
    await owner.put('/me/email-preferences').send({ off: ['PASSWORDS'] }).expect(400);
    const listing = await seedListing(t, owner.user, { status: 'PUBLISHED' });
    await requestBooking(t, renter, listing.id, 1, 3);
    await t.mailSent();
    expect(t.mail.to(owner.email)).toHaveLength(0);
    expect((await owner.get('/me/notifications/unread').expect(200)).body).toEqual({ count: 1 });
  });

  it("tells the person a review was left about them (they write theirs to read it)", async () => {
    const listing = await seedListing(t, owner.user, { status: 'PUBLISHED', title: 'Tent' });
    const booking = await requestBooking(t, renter, listing.id, 1, 3);
    await t.prisma.booking.update({ where: { id: booking.id }, data: { status: 'COMPLETED', completedAt: t.clock.now() } });
    await renter.post(`/bookings/${booking.id}/reviews`).send({ rating: 5, itemRating: 5, text: 'Great tent, thank you!' }).expect(201);
    const items = (await owner.get('/me/notifications').expect(200)).body.items;
    expect(items[0]).toMatchObject({ kind: 'REVIEW', event: 'RECEIVED', bookingId: booking.id, title: 'Tent' });
  });
});
