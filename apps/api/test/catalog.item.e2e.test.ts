import 'reflect-metadata';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetAccounts, resetDeals } from './support/db';
import { day, requestBooking } from './support/deals';
import { resetListings, seedListing, signedInClient, type Client } from './support/listings';
import { createTestApp, type TestApp } from './support/test-app';

describe('item page, profiles and the sitemap', () => {
  let t: TestApp;
  let anna: Client;
  let boris: Client;
  const api = (path: string) => request(t.server).get(`/api/v1${path}`);

  beforeAll(async () => {
    t = await createTestApp();
  });

  beforeEach(async () => {
    await resetDeals(t.prisma);
    await resetListings(t);
    await resetAccounts(t.prisma);
    t.clock.advance(60 * 60_000);
    anna = await signedInClient(t, { name: 'Anna' });
    boris = await signedInClient(t, { name: 'Boris' });
    await t.prisma.user.update({ where: { id: anna.user.id }, data: { city: 'Rīga', about: 'I lend tools.', phone: '+37120000000', phoneVerifiedAt: t.clock.now() } });
  });

  afterAll(async () => {
    await t.close();
  });

  describe('GET /catalog/listings/:id', () => {
    it('gives the public listing, the owner without contacts, the taken days and the fee', async () => {
      const listing = await seedListing(t, anna.user, { status: 'PUBLISHED', contentLocale: 'lv' });
      const booking = await requestBooking(t, boris, listing.id, 10, 12);
      await t.prisma.$executeRaw`UPDATE "Booking" SET "reserved" = daterange(${day(t, 10)}::date, ${day(t, 13)}::date, '[)') WHERE "id" = ${booking.id}`;
      await t.prisma.unavailability.createMany({
        data: [
          { listingId: listing.id, start: new Date(`${day(t, 20)}T00:00:00Z`), end: new Date(`${day(t, 21)}T00:00:00Z`) },
          { listingId: listing.id, start: new Date(`${day(t, -5)}T00:00:00Z`), end: new Date(`${day(t, -3)}T00:00:00Z`) },
        ],
      });

      const { item } = (await api(`/catalog/listings/${listing.id}`).expect(200)).body;
      expect(item).toMatchObject({
        available: true,
        listing: { id: listing.id, contentLocale: 'lv', title: 'Bosch cordless drill' },
        owner: { id: anna.user.id, name: 'Anna', city: 'Rīga', emailVerified: true, phoneVerified: true, completedDeals: 0, listingCount: 1, rating: null },
        blocked: [
          { start: day(t, 10), end: day(t, 12) },
          { start: day(t, 20), end: day(t, 21) },
        ],
        booking: { servicePercent: 10, maxAdvanceDays: 365, today: day(t, 0) },
      });
      const raw = JSON.stringify(item);
      expect(raw).not.toMatch(/"lat"|"lng"|"version"|rejectionReason|@mail\.lv|\+371/);
    });

    it('a hidden item stays with only its title; a removed one is gone; a draft never existed (W03 §G)', async () => {
      const hidden = await seedListing(t, anna.user, { status: 'HIDDEN' });
      const away = (await api(`/catalog/listings/${hidden.id}`).expect(200)).body.item;
      expect(away).toEqual({ available: false, listing: { id: hidden.id, title: 'Bosch cordless drill', categoryId: hidden.categoryId, contentLocale: 'en' } });

      const archived = await seedListing(t, anna.user, { status: 'ARCHIVED', publishedAt: t.clock.now() });
      expect((await api(`/catalog/listings/${archived.id}`).expect(410)).body.error.code).toBe('LISTING_GONE');
      await api(`/catalog/listings/${archived.id}/address`).expect(410);

      const draft = await seedListing(t, anna.user, { status: 'DRAFT' });
      await api(`/catalog/listings/${draft.id}`).expect(404);
      await api(`/catalog/listings/${draft.id}/address`).expect(404);
      await api('/catalog/listings/nope').expect(404);
    });

    it('an item of a blocked owner is away; of a deleted owner, gone', async () => {
      const listing = await seedListing(t, anna.user, { status: 'PUBLISHED' });
      await t.prisma.user.update({ where: { id: anna.user.id }, data: { blockedAt: t.clock.now() } });
      expect((await api(`/catalog/listings/${listing.id}`).expect(200)).body.item.available).toBe(false);
      await t.prisma.user.update({ where: { id: anna.user.id }, data: { deletedAt: t.clock.now() } });
      await api(`/catalog/listings/${listing.id}`).expect(410);
    });

    it('tells the site where the page lives', async () => {
      const listing = await seedListing(t, anna.user, { status: 'PUBLISHED', title: 'Spēļu konsole PS5 nedēļas nogalei', contentLocale: 'lv' });
      expect((await api(`/catalog/listings/${listing.id}/address`).expect(200)).body).toEqual({
        slug: 'spelu-konsole-ps5-nedelas-nogalei',
        contentLocale: 'lv',
        available: true,
      });
    });
  });

  describe('GET /users/:id', () => {
    it('shows the person, their visible items and finished deals, never their contacts', async () => {
      const shown = await seedListing(t, anna.user, { status: 'PUBLISHED' });
      await seedListing(t, anna.user, { status: 'DRAFT' });
      const other = await seedListing(t, boris.user, { status: 'PUBLISHED' });
      const booking = await requestBooking(t, anna, other.id, 2, 3);
      await t.prisma.booking.update({ where: { id: booking.id }, data: { status: 'COMPLETED' } });

      const res = await api(`/users/${anna.user.id}`).expect(200);
      expect(res.body.user).toMatchObject({ id: anna.user.id, name: 'Anna', about: 'I lend tools.', completedDeals: 1, listingCount: 1, rating: null });
      expect(res.body.listings.map((l: { id: string }) => l.id)).toEqual([shown.id]);
      expect(JSON.stringify(res.body)).not.toMatch(/@mail\.lv|\+371|"lat"/);
    });

    it('has no profile for a blocked or deleted account', async () => {
      await t.prisma.user.update({ where: { id: boris.user.id }, data: { blockedAt: t.clock.now() } });
      await api(`/users/${boris.user.id}`).expect(404);
      await api('/users/nobody').expect(404);
    });
  });

  it('the sitemap lists visible items with their language, their owners, and category counts', async () => {
    const lv = await seedListing(t, anna.user, { status: 'PUBLISHED', contentLocale: 'lv' });
    await seedListing(t, anna.user, { status: 'HIDDEN' });
    const res = await api('/catalog/sitemap').expect(200);
    expect(res.body.listings).toEqual([{ id: lv.id, contentLocale: 'lv', updatedAt: expect.any(String) }]);
    expect(res.body.users).toEqual([{ id: anna.user.id, updatedAt: expect.any(String) }]);
    const count = (slug: string) => res.body.categories.find((c: { slug: string }) => c.slug === slug);
    expect(count('tools')).toEqual({ slug: 'tools', slugs: { en: 'tools', lv: 'instrumenti', ru: 'instrumenty' }, count: 1 });
    expect(count('power-tools').count).toBe(1);
    expect(count('electronics').count).toBe(0);
  });
});
