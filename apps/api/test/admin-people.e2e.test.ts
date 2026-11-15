import 'reflect-metadata';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetAccounts, resetDeals } from './support/db';
import { requestBooking } from './support/deals';
import { resetListings, seedListing, signedInClient, type Client } from './support/listings';
import { createTestApp, type TestApp } from './support/test-app';

describe('admin: a person in full, notes, taking listings down and hiding reviews', () => {
  let t: TestApp;
  let admin: Client;
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
    admin = await signedInClient(t, { name: 'Ada', role: 'ADMIN' });
    owner = await signedInClient(t, { name: 'Olga' });
    renter = await signedInClient(t, { name: 'Rita' });
  });

  afterAll(async () => {
    await t.close();
  });

  it('shows a person with their items, deals, reviews, complaints and private notes', async () => {
    const listing = await seedListing(t, owner.user, { status: 'PUBLISHED', title: 'Drill' });
    await requestBooking(t, renter, listing.id, 1, 3);
    await renter.post('/reports').send({ target: 'USER', id: owner.user.id, reason: 'OFFENSIVE', note: 'Rude in chat' }).expect(201);
    await admin.post(`/admin/users/${owner.user.id}/notes`).send({ text: 'Called them; was polite.' }).expect(201);
    await owner.get(`/admin/users/${owner.user.id}`).expect(403);
    const d = (await admin.get(`/admin/users/${owner.user.id}`).expect(200)).body;
    expect(d.user).toMatchObject({ name: 'Olga', blockedAt: null });
    expect(d.stats).toMatchObject({ listings: 1, dealsAsOwner: 1, dealsAsRenter: 0, reportsAgainst: 1 });
    expect(d.listings[0]).toMatchObject({ title: 'Drill', status: 'PUBLISHED' });
    expect(d.deals[0]).toMatchObject({ role: 'OWNER', status: 'REQUESTED' });
    expect(d.reports[0]).toMatchObject({ reason: 'OFFENSIVE', note: 'Rude in chat' });
    expect(d.notes[0]).toMatchObject({ text: 'Called them; was polite.', admin: 'Ada' });
    await admin.get('/admin/users/nobody').expect(404);
  });

  it('takes a published listing down with a reason, telling the owner, and logs it', async () => {
    const listing = await seedListing(t, owner.user, { status: 'PUBLISHED', title: 'Stolen bike' });
    await admin.post(`/admin/listings/${listing.id}/takedown`).send({ reason: 'Looks stolen' }).expect(200);
    await request(t.server).get(`/api/v1/catalog/listings/${listing.id}`).expect((res) => expect(res.body.item?.available ?? false).toBe(false));
    const row = await t.prisma.listing.findUniqueOrThrow({ where: { id: listing.id } });
    expect(row).toMatchObject({ status: 'REJECTED', rejectionReason: 'Looks stolen' });
    expect((await owner.get('/me/notifications').expect(200)).body.items[0]).toMatchObject({ kind: 'LISTING', event: 'REJECTED' });
    expect((await admin.get('/admin/audit?action=LISTING_HIDDEN').expect(200)).body.total).toBe(1);
  });

  it('hides a review from every public list and rating, and shows it again', async () => {
    const listing = await seedListing(t, owner.user, { status: 'PUBLISHED' });
    const booking = await requestBooking(t, renter, listing.id, 1, 3);
    await t.prisma.booking.update({ where: { id: booking.id }, data: { status: 'COMPLETED', completedAt: new Date(t.clock.now().getTime() - 30 * 86_400_000) } });
    const review = await t.prisma.review.create({
      data: { bookingId: booking.id, authorId: renter.user.id, subjectId: owner.user.id, listingId: listing.id, authorRole: 'RENTER', rating: 1, itemRating: 1, text: 'Abusive words here', createdAt: new Date(t.clock.now().getTime() - 29 * 86_400_000) },
    });
    const publicCount = async () => (await request(t.server).get(`/api/v1/users/${owner.user.id}/reviews`).expect(200)).body.total;
    expect(await publicCount()).toBe(1);
    await admin.post(`/admin/reviews/${review.id}/hide`).send({ reason: 'Abusive' }).expect(200);
    expect(await publicCount()).toBe(0);
    expect((await admin.get(`/admin/users/${owner.user.id}`).expect(200)).body.reviews[0]).toMatchObject({ hidden: true });
    await admin.post(`/admin/reviews/${review.id}/show`).expect(200);
    expect(await publicCount()).toBe(1);
  });
});
