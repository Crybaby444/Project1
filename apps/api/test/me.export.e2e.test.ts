import 'reflect-metadata';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetAccounts, resetDeals } from './support/db';
import { returnedDeal, step } from './support/deals';
import { resetListings, seedListing, signedInClient, type Client } from './support/listings';
import { createTestApp, type TestApp } from './support/test-app';

describe('GET /me/export — my data, machine-readable (GDPR access and portability)', () => {
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
    owner = await signedInClient(t, { name: 'Olga Owner' });
    renter = await signedInClient(t, { name: 'Rita Renter' });
  });

  afterAll(async () => {
    await t.close();
  });

  it('needs a session', async () => {
    await request(t.server).get('/api/v1/me/export').expect(401);
  });

  it('is a JSON download with my profile, listings, deals, reviews, favourites, wallet and sessions', async () => {
    const id = await returnedDeal(t, owner, renter);
    await step(owner, id, { type: 'ALL_FINE' });
    await owner.post(`/bookings/${id}/reviews`).send({ rating: 5, text: 'Returned on time and clean.' }).expect(201);
    await seedListing(t, owner.user, { status: 'DRAFT', title: 'A draft only I see' });

    const res = await owner.get('/me/export').expect(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="yoyo-data-.*\.json"/);
    const data = res.body;
    expect(data.profile).toMatchObject({ name: 'Olga Owner', email: owner.user.email });
    expect(data.listings.map((l: { title: string }) => l.title)).toContain('A draft only I see');
    expect(data.deals).toHaveLength(1);
    expect(data.deals[0]).toMatchObject({ id, role: 'OWNER', status: 'COMPLETED' });
    expect(data.reviewsWritten).toHaveLength(1);
    expect(data.wallet).toHaveProperty('balanceCents');
    expect(Array.isArray(data.wallet.history)).toBe(true);
    expect(Array.isArray(data.sessions)).toBe(true);
    expect(data.exportedAt).toBeTruthy();
  });

  it('never carries secrets or other people\'s private data', async () => {
    const id = await returnedDeal(t, owner, renter);
    await step(owner, id, { type: 'ALL_FINE' });
    // The renter's review is still blind for the owner: not in the owner's export.
    await renter.post(`/bookings/${id}/reviews`).send({ rating: 2, itemRating: 2, text: 'Late, and the case was cracked.' }).expect(201);
    const text = (await owner.get('/me/export').expect(200)).text;
    expect(text).not.toMatch(/passwordHash|tokenHash|destinationToken|providerRef/);
    expect(text).not.toContain('Late, and the case was cracked.');
    expect(text).not.toContain(renter.user.email);
  });

  it('carries my conversations with their messages', async () => {
    const listing = await seedListing(t, owner.user, { status: 'PUBLISHED', title: 'Cordless drill' });
    const { conversation } = (await renter.post(`/listings/${listing.id}/conversation`).expect(200)).body;
    await renter.post(`/conversations/${conversation.id}/messages`).send({ text: 'Is it free on Saturday?' }).expect(201);
    await owner.post(`/conversations/${conversation.id}/messages`).send({ text: 'Yes, from 10.' }).expect(201);
    const data = (await renter.get('/me/export').expect(200)).body;
    expect(data.conversations).toHaveLength(1);
    expect(data.conversations[0]).toMatchObject({ item: 'Cordless drill', with: 'Olga Owner', role: 'RENTER' });
    expect(data.conversations[0].messages.map((m: { from: string; text: string }) => [m.from, m.text])).toEqual([
      ['me', 'Is it free on Saturday?'],
      ['Olga Owner', 'Yes, from 10.'],
    ]);
  });
});
