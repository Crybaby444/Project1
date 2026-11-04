import { LOCALES, STICKERS } from '@yoyo/shared';
import { describe, expect, it } from 'vitest';
import { CATALOG, type CatalogCategory } from './catalog-data';

function all(categories: CatalogCategory[]): CatalogCategory[] {
  return categories.flatMap((category) => [category, ...all(category.children ?? [])]);
}

function expectAllLanguages(text: Record<string, string>, where: string): void {
  for (const locale of LOCALES) {
    expect(text[locale]?.trim(), `${where}: ${locale}`).toBeTruthy();
  }
}

describe('CATALOG', () => {
  it('has the eight top-level categories of the plan, each with its sticker', () => {
    expect(CATALOG.map((category) => [category.slug, category.sticker])).toEqual([
      ['electronics', 'blue'],
      ['tools', 'sun'],
      ['sports-outdoors', 'mint'],
      ['home-kitchen', 'lavender'],
      ['events-party', 'ember'],
      ['kids', 'violet'],
      ['music', 'blue'],
      ['car-travel', 'sun'],
    ]);
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

  it('gives every subcategory 2–5 attributes and keeps attributes off the top level', () => {
    for (const top of CATALOG) {
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

  it('asks for the examples of the plan: console model, power tool supply and wattage, bike type and helmet', () => {
    const leaf = (slug: string) => all(CATALOG).find((category) => category.slug === slug)!;
    expect(leaf('game-consoles').attributes!.map((a) => [a.key, a.type])).toEqual([
      ['model', 'SELECT'],
      ['controllers', 'NUMBER'],
      ['games', 'TEXT'],
    ]);
    expect(leaf('power-tools').attributes!.map((a) => [a.key, a.type, a.unit ?? null])).toEqual([
      ['power', 'SELECT', null],
      ['watts', 'NUMBER', 'W'],
      ['included', 'TEXT', null],
    ]);
    expect(leaf('power-tools').attributes![0]!.options!.map((o) => o.value)).toEqual(['mains', 'battery']);
    expect(leaf('bikes-scooters').attributes!.map((a) => [a.key, a.type])).toEqual([
      ['type', 'SELECT'],
      ['frameSize', 'TEXT'],
      ['helmet', 'BOOLEAN'],
    ]);
  });
});
