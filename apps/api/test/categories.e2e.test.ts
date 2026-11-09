import 'reflect-metadata';
import type { CategoryNode } from '@yoyo/shared';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CATALOG } from '../src/categories/catalog-data';
import { CATALOG_VERSION_SETTING, ensureCategories } from '../src/categories/ensure-categories';
import { resetAccounts } from './support/db';
import { seedUser } from './support/users';
import { createTestApp, type TestApp } from './support/test-app';

describe('categories', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(async () => {
    await t.prisma.category.deleteMany({ where: { slug: { startsWith: 'test-' } } });
    await ensureCategories(t.prisma);
    await t.close();
  });

  describe('GET /categories', () => {
    it('serves the catalog as a nested tree with attributes, cacheable for 5 minutes', async () => {
      const res = await request(t.server).get('/api/v1/categories').expect(200);

      expect(res.headers['cache-control']).toBe('public, max-age=300');
      const tree = res.body.categories as CategoryNode[];
      expect(tree.map((category) => category.slug)).toEqual(CATALOG.map((category) => category.slug));
      const electronics = tree.find((category) => category.slug === 'electronics')!;
      expect(electronics).toMatchObject({ sticker: 'blue', attributes: [] });
      expect(electronics.names).toEqual({ en: expect.any(String), lv: expect.any(String), ru: expect.any(String) });
      const consoles = electronics.children.find((category) => category.slug === 'game-consoles')!;
      expect(consoles.children).toEqual([]);
      expect(consoles.attributes[0]).toMatchObject({
        key: 'model',
        type: 'SELECT',
        required: true,
        unit: null,
        options: expect.arrayContaining([{ value: 'ps5', labels: expect.objectContaining({ en: 'PlayStation 5' }) }]),
      });
      expect(consoles.attributes[1]).toMatchObject({ key: 'controllers', type: 'NUMBER', options: null });
      expect(consoles.slugs).toEqual({ en: 'game-consoles', lv: 'spelu-konsoles', ru: 'igrovye-pristavki' });
    });

    it('leaves out inactive categories and everything under them', async () => {
      const electronics = await t.prisma.category.findUniqueOrThrow({ where: { slug: 'electronics' } });
      const hiddenTop = await t.prisma.category.create({
        data: { slug: 'test-hidden-top', sortOrder: 99, sticker: 'mint', icon: 'box', names: { en: 'H', lv: 'H', ru: 'H' }, active: false },
      });
      await t.prisma.category.createMany({
        data: [
          { slug: 'test-hidden-leaf', parentId: electronics.id, sortOrder: 99, sticker: 'blue', icon: 'box', names: { en: 'L', lv: 'L', ru: 'L' }, active: false },
          { slug: 'test-under-hidden', parentId: hiddenTop.id, sortOrder: 0, sticker: 'mint', icon: 'box', names: { en: 'U', lv: 'U', ru: 'U' } },
        ],
      });

      const res = await request(t.server).get('/api/v1/categories').expect(200);

      const slugs = JSON.stringify(res.body);
      expect(slugs).not.toContain('test-hidden-top');
      expect(slugs).not.toContain('test-hidden-leaf');
      expect(slugs).not.toContain('test-under-hidden');
    });

    it('needs no sign-in', async () => {
      await request(t.server).get('/api/v1/categories').expect(200);
    });
  });

  describe('ensureCategories', () => {
    it('runs on start, and running it again (even from two instances at once) duplicates nothing', async () => {
      const before = { categories: await t.prisma.category.count(), attributes: await t.prisma.categoryAttribute.count() };
      expect(before.categories).toBeGreaterThan(CATALOG.length);

      await Promise.all([ensureCategories(t.prisma), ensureCategories(t.prisma)]);
      await ensureCategories(t.prisma);

      expect(await t.prisma.category.count()).toBe(before.categories);
      expect(await t.prisma.categoryAttribute.count()).toBe(before.attributes);
    });

    it('deactivates categories that left the catalog instead of deleting them, and brings them back when they return', async () => {
      const withoutKids = CATALOG.filter((category) => category.slug !== 'kids');
      await ensureCategories(t.prisma, withoutKids);

      const kids = await t.prisma.category.findUniqueOrThrow({ where: { slug: 'kids' }, include: { children: true } });
      expect(kids.active).toBe(false);
      expect(kids.children.every((child) => !child.active)).toBe(true);
      const res = await request(t.server).get('/api/v1/categories').expect(200);
      expect((res.body.categories as CategoryNode[]).map((category) => category.slug)).not.toContain('kids');

      await ensureCategories(t.prisma);
      const back = await t.prisma.category.findUniqueOrThrow({ where: { slug: 'kids' } });
      expect(back.active).toBe(true);
    });

    it('updates changed names and attributes in place', async () => {
      const consoles = await t.prisma.category.findUniqueOrThrow({ where: { slug: 'game-consoles' } });
      await t.prisma.category.update({ where: { id: consoles.id }, data: { names: { en: 'Old', lv: 'Old', ru: 'Old' } } });
      await t.prisma.categoryAttribute.update({
        where: { categoryId_key: { categoryId: consoles.id, key: 'model' } },
        data: { required: false },
      });

      await ensureCategories(t.prisma);

      const fresh = await t.prisma.category.findUniqueOrThrow({ where: { id: consoles.id }, include: { attributes: true } });
      expect((fresh.names as { en: string }).en).not.toBe('Old');
      expect(fresh.attributes.find((attribute) => attribute.key === 'model')!.required).toBe(true);
    });

    it('moves listings of replaced categories once, keeping only attribute values the new category knows', async () => {
      await t.prisma.$executeRawUnsafe('TRUNCATE TABLE "Listing" CASCADE');
      await resetAccounts(t.prisma);
      const { user } = await seedUser(t);
      const tools = await t.prisma.category.findUniqueOrThrow({ where: { slug: 'tools' } });
      const old = await t.prisma.category.create({
        data: { slug: 'test-power-tools', parentId: tools.id, sticker: 'sun', icon: 'drill', names: { en: 'P', lv: 'P', ru: 'P' } },
      });
      const listing = await t.prisma.listing.create({
        data: { ownerId: user.id, categoryId: old.id, title: 'Drill', attributes: { power: 'battery', watts: 750, controllers: 2, brand: 7 } },
      });
      const migration = { legacy: { 'test-power-tools': 'drills-drivers', 'test-gone': 'saws' }, version: 'test-1' };
      await t.prisma.setting.deleteMany({ where: { key: CATALOG_VERSION_SETTING } });

      await ensureCategories(t.prisma, CATALOG, migration);

      const moved = await t.prisma.listing.findUniqueOrThrow({ where: { id: listing.id }, include: { category: true } });
      expect(moved.category!.slug).toBe('drills-drivers');
      expect(moved.attributes).toEqual({ power: 'battery', watts: 750 });
      expect(moved.version).toBe(1);
      expect((await t.prisma.category.findUniqueOrThrow({ where: { id: old.id } })).active).toBe(false);
      expect((await t.prisma.setting.findUniqueOrThrow({ where: { key: CATALOG_VERSION_SETTING } })).value).toBe('test-1');

      // Once per version: a listing put back on the old category is left alone on the next start.
      await t.prisma.listing.update({ where: { id: listing.id }, data: { categoryId: old.id } });
      await ensureCategories(t.prisma, CATALOG, migration);
      expect((await t.prisma.listing.findUniqueOrThrow({ where: { id: listing.id } })).categoryId).toBe(old.id);

      // No listing anywhere points at nothing.
      expect(await t.prisma.listing.count({ where: { categoryId: null } })).toBe(0);
      await t.prisma.$executeRawUnsafe('TRUNCATE TABLE "Listing" CASCADE');
      await t.prisma.setting.deleteMany({ where: { key: CATALOG_VERSION_SETTING } });
    });
  });
});
