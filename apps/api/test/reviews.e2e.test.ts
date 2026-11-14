import 'reflect-metadata';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetAccounts, resetDeals } from './support/db';
import { again, returnedDeal, step } from './support/deals';
import { resetListings, signedInClient, type Client } from './support/listings';
import { createTestApp, type TestApp } from './support/test-app';

const DAY = 86_400_000;
const GOOD = 'Easy hand-over, the item was exactly as shown.';

describe('reviews (plan 10)', () => {
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

  async function completedDeal(): Promise<string> {
    const id = await returnedDeal(t, owner, renter);
    await step(owner, id, { type: 'ALL_FINE' });
    return id;
  }

  it('opens once the deal is completed, for both sides, until the window closes', async () => {
    const id = await returnedDeal(t, owner, renter);
    const before = (await renter.get(`/bookings/${id}/reviews`).expect(200)).body;
    expect(before).toMatchObject({ canReview: false, viewerRole: 'RENTER', mine: null, theirs: null, theirsWaiting: false });
    await renter.post(`/bookings/${id}/reviews`).send({ rating: 5, itemRating: 5, text: GOOD }).expect(409);

    await step(owner, id, { type: 'ALL_FINE' });
    const open = (await owner.get(`/bookings/${id}/reviews`).expect(200)).body;
    expect(open.canReview).toBe(true);
    expect(open.viewerRole).toBe('OWNER');
    expect(new Date(open.deadline).getTime()).toBe(t.clock.now().getTime() + 14 * DAY);

    t.clock.advance(14 * DAY + 1);
    owner = await again(t, owner); // the session ran out with the clock
    expect((await owner.get(`/bookings/${id}/reviews`).expect(200)).body.canReview).toBe(false);
    await owner.post(`/bookings/${id}/reviews`).send({ rating: 4, text: GOOD }).expect(409);
  });

  it('asks the renter for the item too, and takes one review per side', async () => {
    const id = await completedDeal();
    await renter.post(`/bookings/${id}/reviews`).send({ rating: 5, text: GOOD }).expect(400);
    await renter.post(`/bookings/${id}/reviews`).send({ rating: 5, itemRating: 4, text: 'short' }).expect(400);
    const made = (await renter.post(`/bookings/${id}/reviews`).send({ rating: 5, itemRating: 4, text: `  ${GOOD}  ` }).expect(201)).body;
    expect(made.review).toMatchObject({ rating: 5, itemRating: 4, text: GOOD, authorRole: 'RENTER', author: { name: 'Rita Renter' } });
    await renter.post(`/bookings/${id}/reviews`).send({ rating: 1, itemRating: 1, text: GOOD }).expect(409);
    // The owner's stars are about the renter only: an item score from them is ignored.
    const ownerMade = (await owner.post(`/bookings/${id}/reviews`).send({ rating: 4, itemRating: 1, text: 'Returned on time, clean.' }).expect(201)).body;
    expect(ownerMade.review.itemRating).toBeNull();
  });

  it('is only for the two sides of the deal', async () => {
    const id = await completedDeal();
    await stranger.get(`/bookings/${id}/reviews`).expect(404);
    await stranger.post(`/bookings/${id}/reviews`).send({ rating: 5, text: GOOD }).expect(404);
    await request(t.server).get(`/api/v1/bookings/${id}/reviews`).expect(401);
  });

  it('is blind: the other side sees a review only once they wrote theirs, or once the window closed', async () => {
    const id = await completedDeal();
    await renter.post(`/bookings/${id}/reviews`).send({ rating: 2, itemRating: 3, text: 'Late, and the case was cracked.' }).expect(201);

    const ownerView = (await owner.get(`/bookings/${id}/reviews`).expect(200)).body;
    expect(ownerView).toMatchObject({ theirs: null, theirsWaiting: true, mine: null });
    expect((await stranger.get(`/users/${owner.user.id}/reviews`).expect(200)).body.items).toEqual([]);

    await owner.post(`/bookings/${id}/reviews`).send({ rating: 5, text: 'Kind and careful renter.' }).expect(201);
    const both = (await owner.get(`/bookings/${id}/reviews`).expect(200)).body;
    expect(both.theirs).toMatchObject({ rating: 2, text: 'Late, and the case was cracked.', authorRole: 'RENTER' });
    expect(both.theirsWaiting).toBe(false);
  });

  it('shows a lone review once the window has closed', async () => {
    const id = await completedDeal();
    await renter.post(`/bookings/${id}/reviews`).send({ rating: 4, itemRating: 5, text: GOOD }).expect(201);
    expect((await stranger.get(`/users/${owner.user.id}/reviews`).expect(200)).body.total).toBe(0);
    t.clock.advance(14 * DAY + 1);
    stranger = await again(t, stranger);
    const page = (await stranger.get(`/users/${owner.user.id}/reviews`).expect(200)).body;
    expect(page).toMatchObject({ total: 1, average: 4 });
    expect(page.items[0]).toMatchObject({ rating: 4, authorRole: 'RENTER', listing: { title: expect.any(String) } });
  });

  it('rates people on their profile and items in the catalog, from public reviews only', async () => {
    const id = await completedDeal();
    await renter.post(`/bookings/${id}/reviews`).send({ rating: 4, itemRating: 3, text: GOOD }).expect(201);
    await owner.post(`/bookings/${id}/reviews`).send({ rating: 5, text: 'Kind and careful renter.' }).expect(201);
    const listingId = (await t.prisma.booking.findUniqueOrThrow({ where: { id } })).listingId;

    const profile = (await stranger.get(`/users/${owner.user.id}`).expect(200)).body;
    expect(profile.user).toMatchObject({ rating: 4, reviewCount: 1 });
    const renterProfile = (await stranger.get(`/users/${renter.user.id}`).expect(200)).body;
    expect(renterProfile.user).toMatchObject({ rating: 5, reviewCount: 1 });

    const item = (await stranger.get(`/catalog/listings/${listingId}`).expect(200)).body.item;
    expect(item).toMatchObject({ rating: 3, reviewCount: 1 });
    expect(item.owner).toMatchObject({ rating: 4, reviewCount: 1 });
    const itemReviews = (await stranger.get(`/catalog/listings/${listingId}/reviews`).expect(200)).body;
    expect(itemReviews).toMatchObject({ total: 1, average: 3 });
    expect(itemReviews.items[0]).toMatchObject({ itemRating: 3, authorRole: 'RENTER' });

    const card = (await stranger.get('/catalog/listings').expect(200)).body.items.find((i: { id: string }) => i.id === listingId);
    expect(card).toMatchObject({ rating: 3, reviewCount: 1 });
  });
});
