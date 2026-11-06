import 'reflect-metadata';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetAccounts } from './support/db';
import { categoryId, resetListings, seedListing, signedInClient, type Client } from './support/listings';
import { createTestApp, type TestApp } from './support/test-app';

describe('listings', () => {
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
    anna = await signedInClient(t, { name: 'Anna' });
    boris = await signedInClient(t, { name: 'Boris' });
  });

  afterAll(async () => {
    await t.close();
  });

  describe('POST /listings', () => {
    it('creates a draft from almost nothing, owned by the caller', async () => {
      const res = await anna.post('/listings').send({ title: 'Drill' }).expect(201);

      expect(res.body.listing).toMatchObject({
        ownerId: anna.user.id,
        status: 'DRAFT',
        title: 'Drill',
        description: null,
        categoryId: null,
        attributes: {},
        weeklyDiscountPercent: 0,
        depositCents: 0,
        minDays: 1,
        maxDays: 30,
        timeZone: 'Europe/Riga',
        rules: { preset: [], custom: [] },
        photos: [],
        unavailability: [],
        version: 0,
      });
      await anna.post('/listings').expect(201);
    });

    it('cleans HTML out of the texts and checks attributes against the chosen category', async () => {
      const powerTools = await categoryId(t, 'drills-drivers');
      const ok = await anna
        .post('/listings')
        .send({ title: '<b>Drill</b>', categoryId: powerTools, attributes: { power: 'battery', included: '<i>case</i>' } })
        .expect(201);
      expect(ok.body.listing).toMatchObject({ title: 'Drill', attributes: { power: 'battery', included: 'case' } });

      const bad = await anna
        .post('/listings')
        .send({ categoryId: powerTools, attributes: { power: 'solar', watts: '750', model: 'ps5' } })
        .expect(400);
      expect(bad.body.error.code).toBe('VALIDATION_FAILED');
      expect(Object.keys(bad.body.error.fields).sort()).toEqual(['attributes.model', 'attributes.power', 'attributes.watts']);
    });

    it('takes the author’s language as the language of the texts, unless the draft names one', async () => {
      const liga = await signedInClient(t, { name: 'Līga', locale: 'lv' });
      expect((await liga.post('/listings').send({}).expect(201)).body.listing.contentLocale).toBe('lv');
      expect((await liga.post('/listings').send({ contentLocale: 'ru' }).expect(201)).body.listing.contentLocale).toBe('ru');
      expect((await anna.post('/listings').send({}).expect(201)).body.listing.contentLocale).toBe('en');
      await liga.post('/listings').send({ contentLocale: 'de' }).expect(400);
    });

    it('changing the language of a live listing is a term: it stays published', async () => {
      const listing = await seedListing(t, anna.user, { status: 'PUBLISHED' });
      const res = await anna.patch(`/listings/${listing.id}`).send({ contentLocale: 'lv', version: listing.version }).expect(200);
      expect(res.body.listing).toMatchObject({ status: 'PUBLISHED', contentLocale: 'lv' });
    });

    it('refuses an unknown or inactive category', async () => {
      const res = await anna.post('/listings').send({ categoryId: 'nope' }).expect(400);
      expect(res.body.error.fields).toHaveProperty('categoryId');
    });

    it('needs a signed-in user', async () => {
      await request(t.server).post('/api/v1/listings').send({}).expect(401);
    });
  });

  describe('someone else’s listing does not exist for you (IDOR)', () => {
    it('answers 404 to every read and change, and changes nothing', async () => {
      const listing = await seedListing(t, anna.user, { status: 'PUBLISHED' });

      for (const res of [
        await boris.get(`/listings/${listing.id}`),
        await boris.patch(`/listings/${listing.id}`).send({ title: 'Mine now', version: listing.version }),
        await boris.delete(`/listings/${listing.id}`),
      ]) {
        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('NOT_FOUND');
      }
      const after = await t.prisma.listing.findUniqueOrThrow({ where: { id: listing.id } });
      expect(after).toMatchObject({ title: listing.title, status: 'PUBLISHED', version: listing.version });
      expect((await boris.get('/me/listings').expect(200)).body.items).toEqual([]);
    });

    it('lets an administrator read any listing, exact point included', async () => {
      const admin = await signedInClient(t, { role: 'ADMIN' });
      const listing = await seedListing(t, anna.user);
      const res = await admin.get(`/listings/${listing.id}`).expect(200);
      expect(res.body.listing).toMatchObject({ id: listing.id, lat: 56.949651, lng: 24.10519 });
    });
  });

  describe('GET /listings/:id and /me/listings', () => {
    it('shows the owner the whole listing, exact point included', async () => {
      const listing = await seedListing(t, anna.user);
      const res = await anna.get(`/listings/${listing.id}`).expect(200);
      expect(res.body.listing).toMatchObject({ id: listing.id, lat: 56.949651, lng: 24.10519, district: 'Centrs' });
      expect(res.body.listing.photos).toHaveLength(1);
    });

    it('lists my listings newest change first, filtered by status, without archived ones unless asked', async () => {
      const draft = await seedListing(t, anna.user, { title: 'Draft one' });
      t.clock.advance(1000);
      const rejected = await seedListing(t, anna.user, { status: 'REJECTED', rejectionReason: 'The photos are blurry.' });
      await seedListing(t, anna.user, { status: 'ARCHIVED' });
      await seedListing(t, boris.user);
      await t.prisma.listing.update({ where: { id: rejected.id }, data: { updatedAt: new Date(Date.now() + 1000) } });

      const all = await anna.get('/me/listings').expect(200);
      expect(all.body.items.map((item: { id: string }) => item.id)).toEqual([rejected.id, draft.id]);
      expect(all.body.items[0]).toMatchObject({
        status: 'REJECTED',
        rejectionReason: 'The photos are blurry.',
        cover: { thumb: expect.any(String), card: expect.any(String), full: expect.any(String) },
        photoCount: 1,
      });
      const drafts = await anna.get('/me/listings?status=DRAFT').expect(200);
      expect(drafts.body.items.map((item: { id: string }) => item.id)).toEqual([draft.id]);
      expect((await anna.get('/me/listings?status=ARCHIVED').expect(200)).body.items).toHaveLength(1);
      await anna.get('/me/listings?status=LOST').expect(400);
    });
  });

  describe('PATCH /listings/:id', () => {
    it('updates a draft partially and counts the version up', async () => {
      const { body } = await anna.post('/listings').send({ title: 'Drill' }).expect(201);

      const res = await anna
        .patch(`/listings/${body.listing.id}`)
        .send({ version: 0, description: 'Strong drill', dailyCents: 1500, rules: { preset: ['NO_SMOKING'], custom: [] } })
        .expect(200);

      expect(res.body.listing).toMatchObject({
        title: 'Drill',
        description: 'Strong drill',
        dailyCents: 1500,
        rules: { preset: ['NO_SMOKING'], custom: [] },
        status: 'DRAFT',
        version: 1,
      });
    });

    it('refuses a stale version so two tabs never overwrite each other, and says the current one', async () => {
      const { body } = await anna.post('/listings').send({ title: 'Drill' }).expect(201);
      await anna.patch(`/listings/${body.listing.id}`).send({ version: 0, title: 'Tab one' }).expect(200);

      const stale = await anna.patch(`/listings/${body.listing.id}`).send({ version: 0, title: 'Tab two' }).expect(409);

      expect(stale.body.error).toMatchObject({ code: 'INVALID_STATUS', details: { currentVersion: 1 } });
      expect((await anna.get(`/listings/${body.listing.id}`)).body.listing.title).toBe('Tab one');
      await anna.patch(`/listings/${body.listing.id}`).send({ title: 'No version' }).expect(400);
    });

    it('sends a published listing back to review when its content changes', async () => {
      const listing = await seedListing(t, anna.user, { status: 'PUBLISHED' });
      const before = t.clock.now();
      t.clock.advance(5000);

      const res = await anna.patch(`/listings/${listing.id}`).send({ version: listing.version, title: 'Bosch drill, two batteries' }).expect(200);

      expect(res.body.listing).toMatchObject({ status: 'PENDING_REVIEW', title: 'Bosch drill, two batteries' });
      expect(new Date(res.body.listing.submittedAt).getTime()).toBeGreaterThan(before.getTime());
    });

    it('keeps a published listing published when only the price, ready-made rules, point or dates change', async () => {
      const listing = await seedListing(t, anna.user, { status: 'PUBLISHED' });

      const res = await anna
        .patch(`/listings/${listing.id}`)
        .send({ version: listing.version, dailyCents: 1800, depositCents: 6000, rules: { preset: ['PETS_OK'], custom: [] }, lat: 56.95, lng: 24.08 })
        .expect(200);

      expect(res.body.listing).toMatchObject({ status: 'PUBLISHED', dailyCents: 1800, lat: 56.95, rules: { preset: ['PETS_OK'], custom: [] } });
    });

    it('sends a published listing back to review when text the public reads changes: own rules, city or district', async () => {
      const ads = 'Cheap pills, write to t.me/somebody';
      for (const change of [
        { rules: { preset: [], custom: [ads] } },
        { city: 't.me/somebody' },
        { district: 'Call +371 20000000 now' },
      ]) {
        const listing = await seedListing(t, anna.user, { status: 'PUBLISHED' });
        const res = await anna.patch(`/listings/${listing.id}`).send({ version: listing.version, ...change }).expect(200);
        expect(res.body.listing.status, JSON.stringify(change)).toBe('PENDING_REVIEW');
      }
      // Ticking a ready-made rule while keeping the own ones is still only a term.
      const kept = await seedListing(t, anna.user, { status: 'PUBLISHED', rules: { preset: [], custom: ['Handle with care'] } });
      const res = await anna
        .patch(`/listings/${kept.id}`)
        .send({ version: kept.version, rules: { preset: ['NO_SMOKING'], custom: ['Handle with care'] } })
        .expect(200);
      expect(res.body.listing.status).toBe('PUBLISHED');
    });

    it('treats a change of category or attributes as content, and setting the same title again as no change', async () => {
      const published = await seedListing(t, anna.user, { status: 'PUBLISHED' });
      const same = await anna.patch(`/listings/${published.id}`).send({ version: published.version, title: published.title }).expect(200);
      expect(same.body.listing).toMatchObject({ status: 'PUBLISHED', version: published.version });

      const changed = await anna
        .patch(`/listings/${published.id}`)
        .send({ version: published.version, attributes: { power: 'mains', watts: 750 } })
        .expect(200);
      expect(changed.body.listing.status).toBe('PENDING_REVIEW');
    });

    it('clears the attributes of the old category when the category changes', async () => {
      const listing = await seedListing(t, anna.user);
      const bikes = await categoryId(t, 'cycling');
      const res = await anna.patch(`/listings/${listing.id}`).send({ version: listing.version, categoryId: bikes }).expect(200);
      expect(res.body.listing).toMatchObject({ categoryId: bikes, attributes: {} });
    });

    it('refuses any change to an archived listing', async () => {
      const listing = await seedListing(t, anna.user, { status: 'ARCHIVED' });
      const res = await anna.patch(`/listings/${listing.id}`).send({ version: listing.version, dailyCents: 2000 }).expect(409);
      expect(res.body.error.code).toBe('INVALID_STATUS');
    });
  });

  describe('DELETE /listings/:id', () => {
    it('removes a draft for good', async () => {
      const listing = await seedListing(t, anna.user);
      await anna.delete(`/listings/${listing.id}`).expect(204);
      expect(await t.prisma.listing.findUnique({ where: { id: listing.id } })).toBeNull();
      expect(await t.prisma.listingPhoto.count({ where: { listingId: listing.id } })).toBe(0);
    });

    it('archives a published or hidden listing, keeping it for past and future deals', async () => {
      for (const status of ['PUBLISHED', 'HIDDEN'] as const) {
        const listing = await seedListing(t, anna.user, { status });
        await anna.delete(`/listings/${listing.id}`).expect(204);
        expect((await t.prisma.listing.findUniqueOrThrow({ where: { id: listing.id } })).status).toBe('ARCHIVED');
      }
    });

    it('removes a listing in its first review (never public) for good, and archives one that was public before', async () => {
      const fresh = await seedListing(t, anna.user, { status: 'PENDING_REVIEW' });
      await anna.delete(`/listings/${fresh.id}`).expect(204);
      expect(await t.prisma.listing.findUnique({ where: { id: fresh.id } })).toBeNull();

      const edited = await seedListing(t, anna.user, { status: 'PENDING_REVIEW', publishedAt: t.clock.now() });
      await anna.delete(`/listings/${edited.id}`).expect(204);
      expect((await t.prisma.listing.findUniqueOrThrow({ where: { id: edited.id } })).status).toBe('ARCHIVED');
    });

    it('archives a rejected listing that was published before', async () => {
      const listing = await seedListing(t, anna.user, { status: 'REJECTED', publishedAt: t.clock.now() });
      await anna.delete(`/listings/${listing.id}`).expect(204);
      expect((await t.prisma.listing.findUniqueOrThrow({ where: { id: listing.id } })).status).toBe('ARCHIVED');
      await anna.delete(`/listings/${listing.id}`).expect(409);
    });
  });
});
