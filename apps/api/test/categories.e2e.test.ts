import 'reflect-metadata';
import type { CategoryNode } from '@yoyo/shared';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CATALOG } from '../src/categories/catalog-data';
import { ensureCategories } from '../src/categories/ensure-categories';
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
  });
});
