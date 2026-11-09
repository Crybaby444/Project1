import { LOCALES, STICKERS } from '@yoyo/shared';
import { describe, expect, it } from 'vitest';
import { CATALOG, LEGACY_CATEGORIES, OTHER_CATEGORY, type CatalogCategory } from './catalog-data';

function all(categories: CatalogCategory[]): CatalogCategory[] {
  return categories.flatMap((category) => [category, ...all(category.children ?? [])]);
}

function expectAllLanguages(text: Record<string, string>, where: string): void {
  for (const locale of LOCALES) {
    expect(text[locale]?.trim(), `${where}: ${locale}`).toBeTruthy();
  }
}

describe('CATALOG', () => {
  it('has the thirteen roots of the owner-approved tree C02, each with its sticker, and 90 subcategories', () => {
    expect(CATALOG.map((category) => [category.slug, category.sticker])).toEqual([
      ['electronics', 'blue'],
      ['photo-video', 'violet'],
      ['tools', 'sun'],
      ['construction', 'ember'],
      ['garden', 'mint'],
      ['home-kitchen', 'lavender'],
      ['sports', 'blue'],
      ['camping', 'mint'],
      ['kids', 'violet'],
      ['events-party', 'ember'],
      ['music', 'lavender'],
      ['car-travel', 'sun'],
      ['other', 'lavender'],
    ]);
    expect(CATALOG.flatMap((root) => root.children ?? [])).toHaveLength(90);
    for (const root of CATALOG) for (const child of root.children ?? []) expect(child.sticker, child.slug).toBe(root.sticker);
  });

  it('uses the stable key as the English address', () => {
    for (const category of all(CATALOG)) expect(category.slugs.en, category.slug).toBe(category.slug);
  });

  it('gives every category of the earlier tree a home: a leaf of the same key, or a move', () => {
    const PLAN_6 = ['electronics', 'game-consoles', 'photo-video', 'audio', 'laptops-tablets', 'projectors', 'drones', 'tools',
      'power-tools', 'hand-tools', 'garden-tools', 'measuring-tools', 'ladders-scaffolding', 'cleaning-machines', 'sports-outdoors',
      'bikes-scooters', 'camping', 'winter-sports', 'water-sports', 'fitness', 'home-kitchen', 'kitchen-appliances', 'home-cleaning',
      'furniture', 'events-party', 'party-equipment', 'sound-light', 'event-tents-furniture', 'costumes', 'kids',
      'strollers-car-seats', 'toys-games', 'kids-furniture', 'music', 'instruments', 'dj-equipment', 'car-travel',
      'roof-boxes-racks', 'travel-gear', 'car-tools'];
    const roots = new Set(CATALOG.map((root) => root.slug));
    const leaves = new Set(CATALOG.flatMap((root) => root.children ?? []).map((leaf) => leaf.slug));
    for (const old of PLAN_6) {
      if (LEGACY_CATEGORIES[old] !== undefined) {
        const to = LEGACY_CATEGORIES[old]!;
        expect(leaves.has(to) || roots.has(to), `${old} → ${to}`).toBe(true);
      } else {
        expect(leaves.has(old) || roots.has(old), `${old} has no home`).toBe(true);
      }
    }
    // Listings sit on leaves: an old leaf that became a root must move.
    expect(LEGACY_CATEGORIES['photo-video']).toBe('cameras');
    expect(LEGACY_CATEGORIES['camping']).toBe('tents');
  });

  it('names every category, attribute and option in en, lv and ru', () => {
    for (const category of all(CATALOG)) {
      expectAllLanguages(category.names, category.slug);
      for (const attribute of category.attributes ?? []) {
        expectAllLanguages(attribute.labels, `${category.slug}.${attribute.key}`);
        for (const option of attribute.options ?? []) {
          expectAllLanguages(option.labels, `${category.slug}.${attribute.key}.${option.value}`);
        }
      }
    }
  });

  it('gives every subcategory 2–5 attributes and keeps attributes off the top level, except «Other»', () => {
    for (const top of CATALOG) {
      if (top.slug === OTHER_CATEGORY) {
        // A root that takes listings itself: no subcategories, only the common "in the box".
        expect(top.children ?? []).toEqual([]);
        expect(top.attributes?.map((a) => a.key)).toEqual(['included']);
        expect(top.slugs).toEqual({ en: 'other', lv: 'citi', ru: 'drugoe' });
        expect(top.names).toEqual({ en: 'Other', lv: 'Citi', ru: 'Другое' });
        continue;
      }
      expect(top.attributes ?? [], top.slug).toEqual([]);
      expect(top.children?.length, top.slug).toBeGreaterThan(0);
      for (const leaf of top.children ?? []) {
        expect(leaf.children ?? [], leaf.slug).toEqual([]);
        expect(leaf.attributes?.length, leaf.slug).toBeGreaterThanOrEqual(2);
        expect(leaf.attributes?.length, leaf.slug).toBeLessThanOrEqual(5);
      }
    }
  });

  it('uses unique slugs, unique attribute keys per category and unique option values; only SELECT has options', () => {
    const slugs = all(CATALOG).map((category) => category.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const category of all(CATALOG)) {
      expect(STICKERS).toContain(category.sticker);
      const keys = (category.attributes ?? []).map((attribute) => attribute.key);
      expect(new Set(keys).size, category.slug).toBe(keys.length);
      for (const attribute of category.attributes ?? []) {
        if (attribute.type === 'SELECT') {
          const values = (attribute.options ?? []).map((option) => option.value);
          expect(values.length, `${category.slug}.${attribute.key}`).toBeGreaterThanOrEqual(2);
          expect(new Set(values).size).toBe(values.length);
        } else {
          expect(attribute.options, `${category.slug}.${attribute.key}`).toBeUndefined();
        }
      }
    }
  });

  it('asks for the examples of the plan: console model, drill supply and wattage, bike type and helmet', () => {
    const leaf = (slug: string) => all(CATALOG).find((category) => category.slug === slug)!;
    expect(leaf('game-consoles').attributes!.map((a) => [a.key, a.type])).toEqual([
      ['model', 'SELECT'],
      ['controllers', 'NUMBER'],
      ['games', 'TEXT'],
    ]);
    expect(leaf('drills-drivers').attributes!.map((a) => [a.key, a.type, a.unit ?? null])).toEqual([
      ['power', 'SELECT', null],
      ['watts', 'NUMBER', 'W'],
      ['brand', 'TEXT', null],
      ['included', 'TEXT', null],
    ]);
    expect(leaf('drills-drivers').attributes![0]!.options!.map((o) => o.value)).toEqual(['mains', 'battery']);
    expect(leaf('cycling').attributes!.map((a) => [a.key, a.type])).toEqual([
      ['type', 'SELECT'],
      ['frameSize', 'TEXT'],
      ['helmet', 'BOOLEAN'],
    ]);
  });
});
