import 'reflect-metadata';
import { addDays, localDateIn, type LocalDate } from '@yoyo/domain';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetAccounts } from './support/db';
import { categoryId, resetListings, seedListing, signedInClient, type Client } from './support/listings';
import { createTestApp, type TestApp } from './support/test-app';

describe('submitting, hiding and unavailable dates', () => {
  let t: TestApp;
  let anna: Client;
  let boris: Client;

  beforeAll(async () => {
    t = await createTestApp();
  });

  beforeEach(async () => {
    await resetListings(t);
    await resetAccounts(t.prisma);
    t.clock.advance(60 * 60_000);
    anna = await signedInClient(t);
    boris = await signedInClient(t);
  });

  afterAll(async () => {
    await t.close();
  });

  describe('POST /listings/:id/submit', () => {
    it('sends a complete draft to review', async () => {
      const listing = await seedListing(t, anna.user);

      const res = await anna.post(`/listings/${listing.id}/submit`).expect(200);

      expect(res.body.listing).toMatchObject({ status: 'PENDING_REVIEW', submittedAt: t.clock.now().toISOString(), version: listing.version + 1 });
    });

    it('names what is missing, step by step: photos, the point, required attributes', async () => {
      const listing = await seedListing(t, anna.user, { photos: 0, lat: null, lng: null, attributes: { watts: 750 } });

      const res = await anna.post(`/listings/${listing.id}/submit`).expect(400);

      expect(res.body.error.code).toBe('LISTING_INCOMPLETE');
      expect(Object.keys(res.body.error.fields).sort()).toEqual(['attributes.power', 'lat', 'lng', 'photos']);
      expect(res.body.error.details.steps.sort()).toEqual(['attributes', 'photos', 'place']);
      expect((await t.prisma.listing.findUniqueOrThrow({ where: { id: listing.id } })).status).toBe('DRAFT');
    });

    it('names every empty or too short text of an almost empty draft', async () => {
      const { body } = await anna.post('/listings').send({ title: 'Dr', description: 'Too short' }).expect(201);
      const res = await anna.post(`/listings/${body.listing.id}/submit`).expect(400);
      expect(Object.keys(res.body.error.fields).sort()).toEqual(
        ['categoryId', 'city', 'condition', 'dailyCents', 'description', 'district', 'lat', 'lng', 'photos', 'title'].sort(),
      );
    });

    it('refuses a top-level category: listings go into a subcategory', async () => {
      const listing = await seedListing(t, anna.user, { categoryId: await categoryId(t, 'tools'), attributes: {} });
      const res = await anna.post(`/listings/${listing.id}/submit`).expect(400);
      expect(res.body.error.fields).toEqual({ categoryId: expect.any(String) });
    });

    it('applies the price rules of the core: a daily price under the minimum is an error of dailyCents', async () => {
      const cheap = await seedListing(t, anna.user, { dailyCents: 50 });
      expect((await anna.post(`/listings/${cheap.id}/submit`).expect(400)).body.error.fields).toEqual({ dailyCents: expect.any(String) });

      const backwards = await seedListing(t, anna.user, { minDays: 10, maxDays: 3 });
      expect((await anna.post(`/listings/${backwards.id}/submit`).expect(400)).body.error.fields).toEqual({ maxDays: expect.any(String) });
    });

    it('sends a rejected listing to review again and clears the old reason', async () => {
      const listing = await seedListing(t, anna.user, { status: 'REJECTED', rejectionReason: 'Photos are blurry.' });
      const res = await anna.post(`/listings/${listing.id}/submit`).expect(200);
      expect(res.body.listing).toMatchObject({ status: 'PENDING_REVIEW', rejectionReason: null });
    });

    it('refuses listings already in review or live with 409 INVALID_STATUS', async () => {
      for (const status of ['PENDING_REVIEW', 'PUBLISHED', 'HIDDEN', 'ARCHIVED'] as const) {
        const listing = await seedListing(t, anna.user, { status });
        expect((await anna.post(`/listings/${listing.id}/submit`).expect(409)).body.error.code, status).toBe('INVALID_STATUS');
      }
    });
  });

  describe('a live listing stays complete', () => {
    it('refuses an edit that would leave it incomplete', async () => {
      const listing = await seedListing(t, anna.user, { status: 'PUBLISHED' });
      const res = await anna.patch(`/listings/${listing.id}`).send({ version: listing.version, title: 'Dr', city: '' }).expect(400);
      expect(res.body.error).toMatchObject({ code: 'LISTING_INCOMPLETE', fields: { title: expect.any(String), city: expect.any(String) } });
      expect((await t.prisma.listing.findUniqueOrThrow({ where: { id: listing.id } })).title).toBe(listing.title);
    });

    it('still lets the owner change terms when the catalog changed under the listing, refusing only new problems', async () => {
      // An attribute that has since left the category: the listing is no longer complete by today's rules.
      const listing = await seedListing(t, anna.user, { status: 'PUBLISHED', attributes: { power: 'battery', retired: 'old value' } });

      const terms = await anna.patch(`/listings/${listing.id}`).send({ version: listing.version, dailyCents: 1900 }).expect(200);
      expect(terms.body.listing).toMatchObject({ status: 'PUBLISHED', dailyCents: 1900 });

      const worse = await anna.patch(`/listings/${listing.id}`).send({ version: listing.version + 1, title: 'Dr' }).expect(400);
      expect(worse.body.error.fields).toEqual({ title: expect.any(String) });
    });

    it('refuses to delete its last photo', async () => {
      const listing = await seedListing(t, anna.user, { status: 'PUBLISHED' });
      const photo = await t.prisma.listingPhoto.findFirstOrThrow({ where: { listingId: listing.id } });
      const res = await anna.delete(`/listings/${listing.id}/photos/${photo.id}`).expect(400);
      expect(res.body.error).toMatchObject({ code: 'LISTING_INCOMPLETE', fields: { photos: expect.any(String) } });
    });
  });

  describe('hide and unhide', () => {
    it('hides a published listing and shows it again', async () => {
      const listing = await seedListing(t, anna.user, { status: 'PUBLISHED' });
      expect((await anna.post(`/listings/${listing.id}/hide`).expect(200)).body.listing.status).toBe('HIDDEN');
      expect((await anna.post(`/listings/${listing.id}/unhide`).expect(200)).body.listing.status).toBe('PUBLISHED');
    });

    it('refuses to hide what is not published, or to show what is not hidden', async () => {
      const draft = await seedListing(t, anna.user);
      await anna.post(`/listings/${draft.id}/hide`).expect(409);
      await anna.post(`/listings/${draft.id}/unhide`).expect(409);
    });
  });

  describe('PUT /listings/:id/unavailability', () => {
    const today = () => localDateIn(t.clock.now(), 'Europe/Riga');
    const day = (offset: number): LocalDate => addDays(today(), offset);

    it('merges overlapping and touching periods, drops past ones and replaces the whole set', async () => {
      const listing = await seedListing(t, anna.user, { status: 'PUBLISHED' });

      const res = await anna
        .put(`/listings/${listing.id}/unavailability`)
        .send({
          periods: [
            { start: day(4), end: day(8) },
            { start: day(2), end: day(5) },
            { start: day(9), end: day(9) },
            { start: day(20), end: day(21) },
            { start: day(-10), end: day(-2) },
            { start: day(-1), end: day(0) },
          ],
        })
        .expect(200);

      expect(res.body.periods).toEqual([
        { start: day(-1), end: day(0) },
        { start: day(2), end: day(9) },
        { start: day(20), end: day(21) },
      ]);
      expect(res.body.version).toBe(listing.version + 1);
      const fresh = (await anna.get(`/listings/${listing.id}`).expect(200)).body.listing;
      expect(fresh).toMatchObject({ status: 'PUBLISHED', unavailability: res.body.periods });

      const replaced = await anna.put(`/listings/${listing.id}/unavailability`).send({ periods: [{ start: day(3), end: day(4) }] }).expect(200);
      expect(replaced.body.periods).toEqual([{ start: day(3), end: day(4) }]);
      expect((await anna.put(`/listings/${listing.id}/unavailability`).send({ periods: [] }).expect(200)).body.periods).toEqual([]);
    });

    it('changes nothing for the same dates again, and refuses a stale version', async () => {
      const listing = await seedListing(t, anna.user, { status: 'PENDING_REVIEW', submittedAt: new Date('2026-01-01T00:00:00Z') });
      const periods = [{ start: day(1), end: day(2) }];
      const first = await anna.put(`/listings/${listing.id}/unavailability`).send({ periods, version: listing.version }).expect(200);
      const submittedAt = (await t.prisma.listing.findUniqueOrThrow({ where: { id: listing.id } })).submittedAt;

      const again = await anna.put(`/listings/${listing.id}/unavailability`).send({ periods }).expect(200);

      expect(again.body.version).toBe(first.body.version);
      expect((await t.prisma.listing.findUniqueOrThrow({ where: { id: listing.id } })).submittedAt).toEqual(submittedAt);
      const stale = await anna.put(`/listings/${listing.id}/unavailability`).send({ periods: [], version: listing.version }).expect(409);
      expect(stale.body.error.details).toEqual({ currentVersion: first.body.version });
    });

    it('refuses a period that ends before it starts, a day that does not exist and more than 50 periods', async () => {
      const listing = await seedListing(t, anna.user);
      const backwards = await anna.put(`/listings/${listing.id}/unavailability`).send({ periods: [{ start: day(5), end: day(1) }] }).expect(400);
      expect(backwards.body.error.fields).toHaveProperty('periods.0.end');
      const impossible = await anna.put(`/listings/${listing.id}/unavailability`).send({ periods: [{ start: '2027-02-30', end: '2027-03-02' }] }).expect(400);
      expect(impossible.body.error.fields).toHaveProperty('periods.0.start');
      const many = Array.from({ length: 51 }, (_, i) => ({ start: day(i * 2 + 1), end: day(i * 2 + 1) }));
      await anna.put(`/listings/${listing.id}/unavailability`).send({ periods: many }).expect(400);
    });
  });

  describe('someone else’s listing (IDOR)', () => {
    it('answers 404 to submit, hide, unhide and dates, and changes nothing', async () => {
      const draft = await seedListing(t, anna.user);
      const live = await seedListing(t, anna.user, { status: 'PUBLISHED' });

      await boris.post(`/listings/${draft.id}/submit`).expect(404);
      await boris.post(`/listings/${live.id}/hide`).expect(404);
      await boris.post(`/listings/${live.id}/unhide`).expect(404);
      await boris.put(`/listings/${live.id}/unavailability`).send({ periods: [] }).expect(404);

      expect((await t.prisma.listing.findUniqueOrThrow({ where: { id: draft.id } })).status).toBe('DRAFT');
      expect((await t.prisma.listing.findUniqueOrThrow({ where: { id: live.id } })).version).toBe(live.version);
    });
  });
});
