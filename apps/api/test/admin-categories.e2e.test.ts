import 'reflect-metadata';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetAccounts, resetDeals } from './support/db';
import { resetListings, seedListing, signedInClient, type Client } from './support/listings';
import { createTestApp, type TestApp } from './support/test-app';

describe('admin: categories (rename, order, hide) over the catalog from code', () => {
  let t: TestApp;
  let admin: Client;
  let owner: Client;

  beforeAll(async () => {
    t = await createTestApp();
  });

  beforeEach(async () => {
    await resetDeals(t.prisma);
    await resetListings(t);
    await resetAccounts(t.prisma);
    await t.prisma.$executeRawUnsafe('UPDATE "Category" SET "adminNames" = NULL, "adminSortOrder" = NULL, "adminHidden" = false');
    t.clock.advance(60 * 60_000);
    admin = await signedInClient(t, { name: 'Ada', role: 'ADMIN' });
    owner = await signedInClient(t, { name: 'Olga' });
  });

  afterAll(async () => {
    await t.prisma.$executeRawUnsafe('UPDATE "Category" SET "adminNames" = NULL, "adminSortOrder" = NULL, "adminHidden" = false');
    await t.close();
  });

  const tree = async () => (await request(t.server).get('/api/v1/categories').expect(200)).body.categories as { id: string; slug: string; names: { en: string }; children: { id: string; slug: string; names: { en: string } }[] }[];

  it('lists every category with its item count, renames one and puts the name back', async () => {
    await seedListing(t, owner.user, { status: 'PUBLISHED' });
    await owner.get('/admin/categories').expect(403);
    const all = (await admin.get('/admin/categories').expect(200)).body.categories;
    const tools = all.find((c: { slug: string }) => c.slug === 'tools');
    expect(tools.items).toBe(1);
    const drills = tools.children.find((c: { slug: string }) => c.slug === 'drills-drivers');
    await admin.patch(`/admin/categories/${drills.id}`).send({ names: { en: 'Drills', lv: 'Urbjmašīnas', ru: 'Дрели' } }).expect(200);
    expect((await tree()).find((c) => c.slug === 'tools')!.children.find((c) => c.slug === 'drills-drivers')!.names.en).toBe('Drills');
    await admin.patch(`/admin/categories/${drills.id}`).send({ names: null }).expect(200);
    expect((await tree()).find((c) => c.slug === 'tools')!.children.find((c) => c.slug === 'drills-drivers')!.names.en).toBe(drills.defaultNames.en);
    expect((await admin.get('/admin/audit?action=CATEGORY_CHANGED').expect(200)).body.total).toBeGreaterThanOrEqual(2);
  });

  it('moves a category up among its siblings and hides one from the catalog', async () => {
    const before = await tree();
    const second = before[1]!;
    await admin.patch(`/admin/categories/${second.id}`).send({ move: 'up' }).expect(200);
    expect((await tree())[0]!.id).toBe(second.id);
    await admin.patch(`/admin/categories/${second.id}`).send({ hidden: true }).expect(200);
    expect((await tree()).some((c) => c.id === second.id)).toBe(false);
    expect((await admin.get('/admin/categories').expect(200)).body.categories.find((c: { id: string }) => c.id === second.id)).toMatchObject({ hidden: true });
  });
});
