import 'reflect-metadata';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetAccounts, resetDeals } from './support/db';
import { requestBooking, step } from './support/deals';
import { resetListings, seedListing, signedInClient, type Client } from './support/listings';
import { createTestApp, type TestApp } from './support/test-app';

describe('chat (plan 9, spec §4.6)', () => {
  let t: TestApp;
  let owner: Client;
  let renter: Client;
  let stranger: Client;

  beforeAll(async () => {
    t = await createTestApp();
  });

  beforeEach(async () => {
    await resetDeals(t.prisma);
    await resetListings(t);
    await resetAccounts(t.prisma);
    t.clock.advance(60 * 60_000);
    owner = await signedInClient(t, { name: 'Olga Owner' });
    renter = await signedInClient(t, { name: 'Rita Renter' });
    stranger = await signedInClient(t, { name: 'Sam Stranger' });
  });

  afterAll(async () => {
    await t.close();
  });

  async function talk() {
    const listing = await seedListing(t, owner.user, { status: 'PUBLISHED' });
    const { conversation } = (await renter.post(`/listings/${listing.id}/conversation`).expect(200)).body;
    return { listing, conversation };
  }

  it('a renter opens one conversation per item with its owner, and the owner cannot open one with themselves', async () => {
    const { listing, conversation } = await talk();
    const again = (await renter.post(`/listings/${listing.id}/conversation`).expect(200)).body.conversation;
    expect(again.id).toBe(conversation.id);
    expect(conversation).toMatchObject({ role: 'RENTER', other: { name: 'Olga Owner' }, listing: { id: listing.id } });
    await owner.post(`/listings/${listing.id}/conversation`).expect(409);
    const draft = await seedListing(t, owner.user, { status: 'DRAFT' });
    await renter.post(`/listings/${draft.id}/conversation`).expect(404);
  });

  it('sends plain text both ways, newest last, with unread counts and read marks', async () => {
    const { conversation } = await talk();
    await renter.post(`/conversations/${conversation.id}/messages`).send({ text: '  Hi! Is it free on Saturday?  ' }).expect(201);
    t.clock.advance(1000);
    expect((await owner.get('/me/conversations/unread').expect(200)).body).toEqual({ count: 1 });
    const list = (await owner.get('/me/conversations').expect(200)).body.items;
    expect(list[0]).toMatchObject({ id: conversation.id, role: 'OWNER', unread: 1, lastMessage: { text: 'Hi! Is it free on Saturday?', mine: false } });

    const thread = (await owner.get(`/conversations/${conversation.id}`).expect(200)).body;
    expect(thread.messages.map((m: { text: string }) => m.text)).toEqual(['Hi! Is it free on Saturday?']);
    await owner.post(`/conversations/${conversation.id}/read`).expect(204);
    expect((await owner.get('/me/conversations/unread').expect(200)).body).toEqual({ count: 0 });
    const renterView = (await renter.get(`/conversations/${conversation.id}`).expect(200)).body;
    expect(renterView.otherReadAt).not.toBeNull();

    await owner.post(`/conversations/${conversation.id}/messages`).send({ text: 'Yes, take it from 10.' }).expect(201);
    const after = (await renter.get(`/conversations/${conversation.id}?after=${encodeURIComponent(thread.messages[0].createdAt)}`).expect(200)).body;
    expect(after.messages.map((m: { text: string; mine: boolean }) => [m.text, m.mine])).toEqual([['Yes, take it from 10.', false]]);
  });

  it('keeps text plain and bounded', async () => {
    const { conversation } = await talk();
    await renter.post(`/conversations/${conversation.id}/messages`).send({ text: '   ' }).expect(400);
    await renter.post(`/conversations/${conversation.id}/messages`).send({ text: 'x'.repeat(2001) }).expect(400);
    const made = (await renter.post(`/conversations/${conversation.id}/messages`).send({ text: '<b>bold</b><script>x</script> ok' }).expect(201)).body.message;
    expect(made.text).toBe('<b>bold</b><script>x</script> ok'); // stored as plain text; never rendered as HTML
  });

  it('is only for its two sides', async () => {
    const { conversation } = await talk();
    await stranger.get(`/conversations/${conversation.id}`).expect(404);
    await stranger.post(`/conversations/${conversation.id}/messages`).send({ text: 'Hello there' }).expect(404);
    await request(t.server).get('/api/v1/me/conversations').expect(401);
  });

  it('writes the deal steps into the conversation as system lines', async () => {
    const listing = await seedListing(t, owner.user, { status: 'PUBLISHED' });
    const booking = await requestBooking(t, renter, listing.id, 1, 3);
    await step(owner, booking.id, { type: 'ACCEPT' });
    const list = (await renter.get('/me/conversations').expect(200)).body.items;
    expect(list).toHaveLength(1);
    const thread = (await renter.get(`/conversations/${list[0].id}`).expect(200)).body;
    const events = thread.messages.filter((m: { kind: string }) => m.kind === 'SYSTEM').map((m: { event: string }) => m.event);
    expect(events).toEqual(['REQUESTED', 'ACCEPTED']);
    expect(thread.bookingId).toBe(booking.id);
  });
});
