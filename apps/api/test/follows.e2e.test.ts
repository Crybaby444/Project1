import 'reflect-metadata';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetAccounts, resetDeals } from './support/db';
import { resetListings, seedListing, signedInClient, type Client } from './support/listings';
import { createTestApp, type TestApp } from './support/test-app';

describe('following people, their feed and finding people', () => {
  let t: TestApp;
  let olga: Client;
  let janis: Client;
  let admin: Client;

  beforeAll(async () => {
    t = await createTestApp();
  });

  beforeEach(async () => {
    await resetDeals(t.prisma);
    await resetListings(t);
    await resetAccounts(t.prisma);
    t.clock.advance(60 * 60_000);
    olga = await signedInClient(t, { name: 'Olga Kalniņa', username: 'olga.k' });
    janis = await signedInClient(t, { name: 'Jānis Ozols' });
    admin = await signedInClient(t, { name: 'Ada', role: 'ADMIN' });
  });

  afterAll(async () => {
    await t.close();
  });

  it('follows and unfollows; the profile counts followers', async () => {
    await request(t.server).post(`/api/v1/users/${olga.user.id}/follow`).expect(401);
    await janis.post(`/users/${janis.user.id}/follow`).expect(409);
    await janis.post(`/users/${admin.user.id}/follow`).expect(404); // staff have no public profile to follow
    await janis.post(`/users/${olga.user.id}/follow`).expect(204);
    await janis.post(`/users/${olga.user.id}/follow`).expect(204); // twice is once
    const profile = (await request(t.server).get(`/api/v1/users/${olga.user.id}`).expect(200)).body;
    expect(profile.user).toMatchObject({ followers: 1, following: 0 });
    expect((await janis.get('/me/following/ids').expect(200)).body.ids).toEqual([olga.user.id]);
    expect((await janis.get('/me/following').expect(200)).body.items).toEqual([expect.objectContaining({ id: olga.user.id, name: 'Olga Kalniņa', followers: 1 })]);
    await janis.delete(`/users/${olga.user.id}/follow`).expect(204);
    expect((await request(t.server).get(`/api/v1/users/${olga.user.id}`).expect(200)).body.user.followers).toBe(0);
  });

  it('a new item from someone you follow reaches your feed and your bell', async () => {
    await janis.post(`/users/${olga.user.id}/follow`).expect(204);
    const old = await seedListing(t, olga.user, { status: 'PUBLISHED', title: 'Old drill' });
    const pending = await seedListing(t, olga.user, { status: 'PENDING_REVIEW', title: 'New ladder' });
    await admin.post(`/admin/listings/${pending.id}/approve`).send({ version: pending.version }).expect((r) => expect([200, 201, 204]).toContain(r.status));
    const feed = (await janis.get('/me/following/feed').expect(200)).body;
    expect(feed.total).toBe(2);
    expect(feed.items.map((i: { id: string }) => i.id)).toEqual(expect.arrayContaining([old.id, pending.id]));
    expect(feed.items[0].owner).toEqual({ id: olga.user.id, name: 'Olga Kalniņa' });
    const bell = (await janis.get('/me/notifications').expect(200)).body.items;
    expect(bell).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'FOLLOW', event: 'NEW_LISTING', listingId: pending.id })]));
  });

  it('finds people by name, accents ignored, never staff', async () => {
    await janis.post(`/users/${olga.user.id}/follow`).expect(204);
    const found = (await request(t.server).get('/api/v1/people?q=kalnina').expect(200)).body.items;
    expect(found.map((p: { name: string }) => p.name)).toEqual(['Olga Kalniņa']);
    expect((await request(t.server).get('/api/v1/people?q=ada').expect(200)).body.items).toEqual([]);
    await request(t.server).get('/api/v1/people?q=a').expect(400);
  });

  it('finds people by username first (with or without @)', async () => {
    const byUsername = (await request(t.server).get('/api/v1/people?q=%40olga').expect(200)).body.items;
    expect(byUsername[0]).toMatchObject({ name: 'Olga Kalniņa', username: 'olga.k' });
  });

  it('renting and lending need a birth date; it can be added once, 18 or older', async () => {
    const google = await signedInClient(t, { name: 'Gina Google', birthDate: null });
    const listing = await seedListing(t, olga.user, { status: 'PUBLISHED' });
    const tomorrow = new Date(t.clock.now().getTime() + 3 * 86_400_000).toISOString().slice(0, 10);
    const asked = await google.post('/bookings').set('Idempotency-Key', 'k-incomplete-1').send({ listingId: listing.id, start: tomorrow, end: tomorrow });
    expect(asked.status).toBe(409);
    expect(asked.body.error).toMatchObject({ code: 'PROFILE_INCOMPLETE', details: { birthDate: false } });
    const young = new Date(Date.UTC(t.clock.now().getUTCFullYear() - 17, 0, 1)).toISOString().slice(0, 10);
    expect((await google.patch('/me').send({ birthDate: young }).expect(400)).body.error.code).toBe('UNDERAGE');
    expect((await google.patch('/me').send({ birthDate: '1991-03-04' }).expect(200)).body.user.birthDate).toBe('1991-03-04');
    await google.patch('/me').send({ birthDate: '1980-01-01' }).expect(409);
    await google.patch('/me').send({ username: 'olga.k' }).expect(409);
    expect((await google.patch('/me').send({ username: 'Gina.G' }).expect(200)).body.user.username).toBe('gina.g');
  });
});
