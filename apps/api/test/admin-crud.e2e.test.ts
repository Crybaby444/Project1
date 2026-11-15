import 'reflect-metadata';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ensureCategories } from '../src/categories/ensure-categories';
import { resetAccounts, resetDeals } from './support/db';
import { categoryId, resetListings, seedListing, signedInClient, type Client } from './support/listings';
import { createTestApp, type TestApp } from './support/test-app';

describe('admin: add, edit and delete categories and people', () => {
  let t: TestApp;
  let admin: Client;
  let owner: Client;

  const cleanCategories = async () => {
    await t.prisma.listing.updateMany({ where: { category: { adminCreated: true } }, data: { categoryId: await categoryId(t, 'drills-drivers') } });
    await t.prisma.category.deleteMany({ where: { adminCreated: true, parentId: { not: null } } });
    await t.prisma.category.deleteMany({ where: { adminCreated: true } });
    await t.prisma.$executeRawUnsafe('UPDATE "Category" SET "adminDeleted" = false, "active" = true WHERE "adminDeleted" = true');
  };

  beforeAll(async () => {
    t = await createTestApp();
  });

  beforeEach(async () => {
    await resetDeals(t.prisma);
    await resetListings(t);
    await resetAccounts(t.prisma);
    await cleanCategories();
    await t.prisma.$executeRawUnsafe('TRUNCATE "AdminAuditLog"');
    t.clock.advance(60 * 60_000);
    admin = await signedInClient(t, { name: 'Ada', role: 'ADMIN' });
    owner = await signedInClient(t, { name: 'Olga' });
  });

  afterAll(async () => {
    await cleanCategories();
    await t.close();
  });

  const tree = async () => (await request(t.server).get('/api/v1/categories').expect(200)).body.categories as { id: string; slug: string; slugs: Record<string, string>; names: { en: string }; children: { id: string; slug: string; names: { en: string } }[] }[];

  it('adds a root and a subcategory with addresses in each language; a listing can go in it', async () => {
    await owner.post('/admin/categories').send({ names: { en: 'Garden', lv: 'Dārzs', ru: 'Сад' }, parentId: null }).expect(403);
    const root = (await admin.post('/admin/categories').send({ names: { en: 'Garden', lv: 'Dārzs', ru: 'Сад' }, parentId: null }).expect(201)).body.id;
    const sub = (await admin.post('/admin/categories').send({ names: { en: 'Garden furniture', lv: 'Dārza mēbeles', ru: 'Садовая мебель' }, parentId: root }).expect(201)).body.id;
    await admin.post('/admin/categories').send({ names: { en: 'Too deep', lv: 'Par dziļu', ru: 'Слишком' }, parentId: sub }).expect(409);
    const found = (await tree()).find((c) => c.id === root)!;
    expect(found.names.en).toBe('Garden');
    expect(found.children.map((c) => c.names.en)).toEqual(['Garden furniture']);
    const row = await t.prisma.category.findUniqueOrThrow({ where: { id: sub } });
    expect(row.slugs).toEqual({ en: 'garden-furniture', lv: 'darza-mebeles', ru: 'sadovaya-mebel' });
    await seedListing(t, owner.user, { status: 'PUBLISHED', categoryId: sub });

    // The catalog sync from code (every deploy) leaves categories made here alone.
    await ensureCategories(t.prisma);
    expect((await t.prisma.category.findUniqueOrThrow({ where: { id: sub } })).active).toBe(true);
    expect((await admin.get('/admin/audit?action=CATEGORY_CREATED').expect(200)).body.total).toBe(2);
  });

  it('deletes a category: subcategories first, its listings move where the admin says', async () => {
    const tools = (await tree()).find((c) => c.slug === 'tools')!;
    await admin.delete(`/admin/categories/${tools.id}`).expect(409);
    const drills = await categoryId(t, 'drills-drivers');
    const saws = tools.children.find((c) => c.slug !== 'drills-drivers')!.id;
    const listing = await seedListing(t, owner.user, { status: 'PUBLISHED' });
    const refused = await admin.delete(`/admin/categories/${drills}`).expect(409);
    expect(refused.body.error.details).toMatchObject({ why: 'HAS_LISTINGS', listings: 1 });
    await admin.delete(`/admin/categories/${drills}?moveTo=${tools.id}`).expect(400); // a root takes no listings
    await admin.delete(`/admin/categories/${drills}?moveTo=${saws}`).expect(204);
    expect((await t.prisma.listing.findUniqueOrThrow({ where: { id: listing.id } })).categoryId).toBe(saws);
    expect((await tree()).find((c) => c.slug === 'tools')!.children.some((c) => c.slug === 'drills-drivers')).toBe(false);
    // A deleted catalog category stays deleted after the next deploy's sync.
    await ensureCategories(t.prisma);
    expect((await t.prisma.category.findUniqueOrThrow({ where: { id: drills } })).active).toBe(false);
    expect((await admin.get('/admin/audit?action=CATEGORY_DELETED').expect(200)).body.total).toBe(1);
  });

  it('adds a person (with or without a password), edits and deletes them', async () => {
    const withPw = (await admin.post('/admin/users').send({ name: 'Ivo', email: 'IVO@mail.lv', password: 'long enough pw', locale: 'lv' }).expect(201)).body;
    expect(withPw.passwordLinkSent).toBe(false);
    await request(t.server).post('/api/v1/auth/login').send({ email: 'ivo@mail.lv', password: 'long enough pw' }).expect(200);
    await admin.post('/admin/users').send({ name: 'Dup', email: 'ivo@mail.lv' }).expect(409);
    const sent = t.mail.sent.length;
    const noPw = (await admin.post('/admin/users').send({ name: 'Lina', email: 'lina@mail.lv' }).expect(201)).body;
    expect(noPw.passwordLinkSent).toBe(true);
    await expect.poll(() => t.mail.sent.length).toBeGreaterThan(sent);

    await admin.patch(`/admin/users/${withPw.id}`).send({ name: 'Ivo Ozols', city: 'Rīga' }).expect(204);
    await admin.patch(`/admin/users/${withPw.id}`).send({ email: 'lina@mail.lv' }).expect(409);
    expect((await admin.get(`/admin/users/${withPw.id}`).expect(200)).body.user).toMatchObject({ name: 'Ivo Ozols', city: 'Rīga' });

    await admin.delete(`/admin/users/${admin.user.id}`).expect(409);
    await admin.delete(`/admin/users/${withPw.id}`).expect(204);
    await request(t.server).post('/api/v1/auth/login').send({ email: 'ivo@mail.lv', password: 'long enough pw' }).expect(401);
    const log = (await admin.get('/admin/audit').expect(200)).body.items.map((e: { action: string }) => e.action);
    expect(log).toEqual(expect.arrayContaining(['USER_CREATED', 'USER_EDITED', 'USER_DELETED']));
  });
});
