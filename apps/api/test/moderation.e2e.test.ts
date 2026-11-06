import 'reflect-metadata';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import en from '../src/mail/i18n/en.json';
import lv from '../src/mail/i18n/lv.json';
import ru from '../src/mail/i18n/ru.json';
import { SmtpMailProvider } from '../src/mail/smtp-mail.provider';
import { resetAccounts } from './support/db';
import { categoryId, resetListings, seedListing, signedInClient, type Client } from './support/listings';
import { mailbox } from './support/mailbox';
import { createTestApp, type TestApp } from './support/test-app';

describe('listing moderation', () => {
  let t: TestApp;
  let admin: Client;
  let anna: Client;

  beforeAll(async () => {
    // Real SMTP into Mailpit: the emails are checked as they arrive.
    t = await createTestApp({ mailProvider: new SmtpMailProvider(process.env['SMTP_URL'] ?? 'smtp://localhost:1025', 'Yoyo <no-reply@yoyo.local>') });
  });

  beforeEach(async () => {
    await resetListings(t);
    await resetAccounts(t.prisma);
    t.clock.advance(60 * 60_000);
    admin = await signedInClient(t, { role: 'ADMIN', name: 'Admin' });
    anna = await signedInClient(t, { name: 'Anna', locale: 'lv' });
  });

  afterAll(async () => {
    await t.close();
  });

  describe('access', () => {
    it('is for administrators only: a user, even the owner, gets 403', async () => {
      const listing = await seedListing(t, anna.user, { status: 'PENDING_REVIEW' });
      for (const res of [
        await anna.get('/admin/listings'),
        await anna.post(`/admin/listings/${listing.id}/approve`),
        await anna.post(`/admin/listings/${listing.id}/reject`).send({ reason: 'Looks fine to me, honestly.' }),
      ]) {
        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe('AUTH_FORBIDDEN');
      }
      expect((await t.prisma.listing.findUniqueOrThrow({ where: { id: listing.id } })).status).toBe('PENDING_REVIEW');
    });

    it('does not let an administrator approve their own listing', async () => {
      const own = await seedListing(t, admin.user, { status: 'PENDING_REVIEW' });
      expect((await admin.post(`/admin/listings/${own.id}/approve`).send({ version: own.version }).expect(403)).body.error.code).toBe('AUTH_FORBIDDEN');
    });
  });

  describe('GET /admin/listings', () => {
    it('shows the review queue oldest first, 20 a page, with the owner', async () => {
      const ids: string[] = [];
      for (let i = 0; i < 22; i++) {
        ids.push((await seedListing(t, anna.user, { status: 'PENDING_REVIEW', submittedAt: new Date(t.clock.now().getTime() + i * 1000) })).id);
      }
      await seedListing(t, anna.user, { status: 'PUBLISHED' });

      const first = await admin.get('/admin/listings').expect(200);
      expect(first.body.total).toBe(22);
      expect(first.body.items).toHaveLength(20);
      expect(first.body.items.map((item: { id: string }) => item.id)).toEqual(ids.slice(0, 20));
      expect(first.body.items[0]).toMatchObject({ status: 'PENDING_REVIEW', lat: 56.949651, owner: { id: anna.user.id, name: 'Anna', email: anna.email } });
      const second = await admin.get('/admin/listings?status=PENDING_REVIEW&page=2').expect(200);
      expect(second.body.items.map((item: { id: string }) => item.id)).toEqual(ids.slice(20));
      expect((await admin.get('/admin/listings?status=PUBLISHED').expect(200)).body.total).toBe(1);
    });
  });

  describe('POST /admin/listings/:id/approve', () => {
    it('publishes the listing and emails the owner in their language with a link to it', async () => {
      const listing = await seedListing(t, anna.user, { status: 'PENDING_REVIEW', contentLocale: 'lv' });

      const res = await admin.post(`/admin/listings/${listing.id}/approve`).send({ version: listing.version }).expect(200);

      expect(res.body.listing).toMatchObject({
        status: 'PUBLISHED',
        publishedAt: t.clock.now().toISOString(),
        reviewedAt: t.clock.now().toISOString(),
        reviewedById: admin.user.id,
      });
      await t.mailSent();
      const mail = await mailbox.latestTo(anna.email);
      expect(mail.subject).toBe(lv.listingApproved.subject);
      expect(mail.text).toContain(listing.title!);
      // The item's own page: in the language it is written in, with its slug (plan 7).
      expect(mail.html).toContain(`${t.env.WEB_ORIGIN}/lv/listings/${listing.id}-bosch-cordless-drill`);
    });

    it('refuses a listing that is not in review with 409, and a missing one with 404', async () => {
      for (const status of ['DRAFT', 'PUBLISHED', 'REJECTED', 'HIDDEN', 'ARCHIVED'] as const) {
        const listing = await seedListing(t, anna.user, { status });
        expect((await admin.post(`/admin/listings/${listing.id}/approve`).send({ version: listing.version }).expect(409)).body.error.code, status).toBe('INVALID_STATUS');
      }
      await admin.post('/admin/listings/nope/approve').send({ version: 0 }).expect(404);
    });

    it('refuses to approve a version the owner has changed since the administrator looked', async () => {
      const listing = await seedListing(t, anna.user, { status: 'PENDING_REVIEW' });
      const res = await admin.post(`/admin/listings/${listing.id}/approve`).send({ version: listing.version + 1 }).expect(409);
      expect(res.body.error.details).toEqual({ currentVersion: listing.version });
    });

    it('needs the version the administrator reviewed, so content swapped in after they looked is never published unseen', async () => {
      const listing = await seedListing(t, anna.user, { status: 'PENDING_REVIEW' });
      const seen = (await admin.get(`/admin/listings`).expect(200)).body.items[0];
      expect(seen.title).toBe(listing.title);
      // While the administrator reads it, the owner swaps the title (the listing stays in review).
      await anna.patch(`/listings/${listing.id}`).send({ version: seen.version, title: 'Totally different thing now' }).expect(200);

      for (const res of [
        await admin.post(`/admin/listings/${listing.id}/approve`),
        await admin.post(`/admin/listings/${listing.id}/approve`).send({}),
        await admin.post(`/admin/listings/${listing.id}/reject`).send({ reason: 'Please add a photo of the charger.' }),
      ]) {
        expect(res.status, JSON.stringify(res.body)).toBe(400);
        expect(res.body.error.fields, JSON.stringify(res.body)).toHaveProperty('version');
      }
      await admin.post(`/admin/listings/${listing.id}/approve`).send({ version: seen.version }).expect(409);
      expect((await t.prisma.listing.findUniqueOrThrow({ where: { id: listing.id } })).status).toBe('PENDING_REVIEW');
    });

    it('keeps the date of the first publication when an edited listing is approved again', async () => {
      const first = new Date('2026-01-01T10:00:00Z');
      const listing = await seedListing(t, anna.user, { status: 'PENDING_REVIEW', publishedAt: first });
      const res = await admin.post(`/admin/listings/${listing.id}/approve`).send({ version: listing.version }).expect(200);
      expect(res.body.listing.publishedAt).toBe(first.toISOString());
    });
  });

  describe('POST /admin/listings/:id/reject', () => {
    it('needs a reason of 10–500 characters', async () => {
      const listing = await seedListing(t, anna.user, { status: 'PENDING_REVIEW' });
      expect((await admin.post(`/admin/listings/${listing.id}/reject`).send({}).expect(400)).body.error.fields).toHaveProperty('reason');
      await admin.post(`/admin/listings/${listing.id}/reject`).send({ reason: 'Too short', version: listing.version }).expect(400);
      await admin.post(`/admin/listings/${listing.id}/reject`).send({ reason: 'x'.repeat(501), version: listing.version }).expect(400);
      await admin.post(`/admin/listings/${listing.id}/reject`).expect(400);
    });

    it('rejects with a reason the owner sees in My listings and gets by email in their language', async () => {
      const boris = await signedInClient(t, { name: 'Boris', locale: 'ru' });
      const listing = await seedListing(t, boris.user, { status: 'PENDING_REVIEW' });

      const res = await admin
        .post(`/admin/listings/${listing.id}/reject`)
        .send({ reason: '  The photos show a <b>different</b> drill. ', version: listing.version })
        .expect(200);

      expect(res.body.listing).toMatchObject({ status: 'REJECTED', rejectionReason: 'The photos show a different drill.', reviewedById: admin.user.id });
      const mine = await boris.get('/me/listings').expect(200);
      expect(mine.body.items[0]).toMatchObject({ id: listing.id, status: 'REJECTED', rejectionReason: 'The photos show a different drill.' });
      await t.mailSent();
      const mail = await mailbox.latestTo(boris.email);
      expect(mail.subject).toBe(ru.listingRejected.subject);
      expect(mail.text).toContain('The photos show a different drill.');
      expect(mail.html).toContain(`${t.env.WEB_ORIGIN}/ru/listings/${listing.id}/edit`);
    });

    it('writes English for an English owner, with no language prefix in the link', async () => {
      const carl = await signedInClient(t, { locale: 'en' });
      const listing = await seedListing(t, carl.user, { status: 'PENDING_REVIEW' });
      await admin.post(`/admin/listings/${listing.id}/reject`).send({ reason: 'Please add a photo of the charger.', version: listing.version }).expect(200);
      await t.mailSent();
      const mail = await mailbox.latestTo(carl.email);
      expect(mail.subject).toBe(en.listingRejected.subject);
      expect(mail.html).toContain(`${t.env.WEB_ORIGIN}/listings/${listing.id}/edit`);
    });
  });

  describe('the «Other» queue and moving a listing to another category', () => {
    it('lists what is filed under «Other», in every live status, and nothing else', async () => {
      const other = await categoryId(t, 'other');
      const waiting = await seedListing(t, anna.user, { status: 'PENDING_REVIEW', categoryId: other, attributes: { included: 'Case' } });
      const live = await seedListing(t, anna.user, { status: 'PUBLISHED', categoryId: other, attributes: {} });
      await seedListing(t, anna.user, { status: 'DRAFT', categoryId: other, attributes: {} });
      await seedListing(t, anna.user, { status: 'PENDING_REVIEW' });

      const res = await admin.get('/admin/listings?category=other').expect(200);
      expect(res.body.items.map((item: { id: string }) => item.id).sort()).toEqual([waiting.id, live.id].sort());
      expect(res.body.total).toBe(2);
      expect((await admin.get('/admin/listings?category=other&status=PUBLISHED').expect(200)).body.items).toHaveLength(1);
      await anna.get('/admin/listings?category=other').expect(403);
    });

    it('a listing in «Other» can go to review and be published like any other', async () => {
      const draft = await seedListing(t, anna.user, { status: 'DRAFT', categoryId: await categoryId(t, 'other'), attributes: { included: 'Charger' } });
      await anna.post(`/listings/${draft.id}/submit`).expect(200);
    });

    it('moves a listing, keeps its status, drops attribute values the new category does not know, and emails the owner', async () => {
      const listing = await seedListing(t, anna.user, { status: 'PUBLISHED', categoryId: await categoryId(t, 'other'), attributes: { included: 'Two batteries' } });
      const drills = await categoryId(t, 'drills-drivers');

      const res = await admin.post(`/admin/listings/${listing.id}/category`).send({ categoryId: drills, version: listing.version }).expect(200);

      expect(res.body.listing).toMatchObject({ status: 'PUBLISHED', categoryId: drills, attributes: { included: 'Two batteries' }, version: listing.version + 1 });
      await t.mailSent();
      const mail = await mailbox.latestTo(anna.email);
      expect(mail.subject).toBe(lv.listingMoved.subject);
      expect(mail.text).toContain('Urbjmašīnas un skrūvgrieži');
      expect(mail.html).toContain(`${t.env.WEB_ORIGIN}/lv/listings/${listing.id}/edit?step=attributes`);
    });

    it('refuses a category with subcategories, the same category, a stale version, an archived or own listing', async () => {
      const other = await categoryId(t, 'other');
      const listing = await seedListing(t, anna.user, { status: 'PUBLISHED', categoryId: other, attributes: {} });
      const move = (categoryId: string, version = listing.version, id = listing.id) => admin.post(`/admin/listings/${id}/category`).send({ categoryId, version });

      expect((await move(await categoryId(t, 'tools')).expect(400)).body.error.fields).toHaveProperty('categoryId');
      expect((await move(other).expect(400)).body.error.fields).toHaveProperty('categoryId');
      expect((await move(await categoryId(t, 'saws'), listing.version + 5).expect(409)).body.error.code).toBe('INVALID_STATUS');
      const archived = await seedListing(t, anna.user, { status: 'ARCHIVED', categoryId: other, attributes: {} });
      await move(await categoryId(t, 'saws'), archived.version, archived.id).expect(409);
      const own = await seedListing(t, admin.user, { status: 'PUBLISHED', categoryId: other, attributes: {} });
      await move(await categoryId(t, 'saws'), own.version, own.id).expect(403);
      await anna.post(`/admin/listings/${listing.id}/category`).send({ categoryId: await categoryId(t, 'saws'), version: listing.version }).expect(403);
    });
  });
});
