import 'reflect-metadata';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetAccounts, resetDeals } from './support/db';
import { requestBooking } from './support/deals';
import { resetListings, seedListing, signedInClient, type Client } from './support/listings';
import { createTestApp, type TestApp } from './support/test-app';
import { withIdentity } from './support/users';

type Row = { kind: string; actor: { id: string; name: string } | null; targetType: string | null; targetId: string | null; summary: string };

describe('admin: everything people do (owner, 2026-11-16)', () => {
  let t: TestApp;
  let admin: Client;
  let anna: Client;

  beforeAll(async () => {
    t = await createTestApp();
  });
  beforeEach(async () => {
    await resetDeals(t.prisma);
    await resetListings(t);
    await resetAccounts(t.prisma);
    await t.prisma.activityEvent.deleteMany();
    admin = await signedInClient(t, { name: 'Admin', role: 'ADMIN', staffRole: 'OWNER' });
    anna = await signedInClient(t, { name: 'Anna Owner' });
  });
  afterAll(async () => {
    await t.close();
  });

  const feed = async (query: Record<string, string> = {}) => (await admin.get('/admin/activity').query(query).expect(200)).body.items as Row[];

  it('records sign-ups, sign-ins, listings, deals and messages, newest first', async () => {
    await request(t.server).post('/api/v1/auth/register').send(withIdentity({ email: 'new@mail.lv', password: 'correct horse', name: 'New Person' })).expect(201);
    await request(t.server).post('/api/v1/auth/login').send({ email: 'new@mail.lv', password: 'correct horse' }).expect(200);
    const draft = (await anna.post('/listings').send({ title: 'Bosch drill for weekend jobs' }).expect(201)).body.listing;
    const live = await seedListing(t, anna.user, { status: 'PUBLISHED' });
    const rita = await signedInClient(t, { name: 'Rita Renter' });
    const booking = await requestBooking(t, rita, live.id, 2, 3);
    const chat = (await rita.post(`/listings/${live.id}/conversation`).expect(200)).body.conversation;
    await rita.post(`/conversations/${chat.id}/messages`).send({ text: 'Hello, is it free on Friday?' }).expect(201);

    const kinds = (await feed()).map((r) => r.kind);
    expect(kinds).toEqual(expect.arrayContaining(['USER_REGISTERED', 'USER_SIGNED_IN', 'LISTING_CREATED', 'BOOKING_REQUESTED', 'MESSAGE_SENT']));
    const created = (await feed()).find((r) => r.kind === 'LISTING_CREATED')!;
    expect(created).toMatchObject({ actor: { id: anna.user.id }, targetType: 'LISTING', targetId: draft.id });
    expect((await feed()).find((r) => r.kind === 'BOOKING_REQUESTED')).toMatchObject({ targetId: booking.id });
    // A message is recorded as sent, never its words.
    expect(JSON.stringify(await feed())).not.toContain('free on Friday');
  });

  it('filters by kind group and by person, and pages with a cursor', async () => {
    await anna.post('/listings').send({ title: 'Tent for four people' }).expect(201);
    await anna.post('/listings').send({ title: 'Projector for movie nights' }).expect(201);
    await request(t.server).post('/api/v1/auth/register').send(withIdentity({ email: 'bob@mail.lv', password: 'correct horse', name: 'Bob Person' })).expect(201);
    expect((await feed({ group: 'listings' })).map((r) => r.kind)).toEqual(['LISTING_CREATED', 'LISTING_CREATED']);
    expect((await feed({ group: 'accounts' })).map((r) => r.kind)).toEqual(['USER_REGISTERED']);
    expect((await feed({ userId: anna.user.id })).every((r) => r.actor?.id === anna.user.id)).toBe(true);
    const first = (await admin.get('/admin/activity').query({ limit: '1' }).expect(200)).body;
    expect(first.items).toHaveLength(1);
    const next = (await admin.get('/admin/activity').query({ limit: '1', before: first.next }).expect(200)).body;
    expect(next.items[0].id).not.toBe(first.items[0].id);
  });

  it('is for staff only', async () => {
    await anna.get('/admin/activity').expect(403);
  });
});
