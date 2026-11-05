import { PRICING_LIMITS, validatePricing } from '@yoyo/domain';
import type { CategoryNode } from '@yoyo/shared';
import { describe, expect, it } from 'vitest';
import { checkListing, emptyValues, stepOf, type ListingValues } from './listing-checks';

const leaf: CategoryNode = {
  id: 'cat-consoles',
  slug: 'consoles',
  sticker: 'blue',
  icon: 'gamepad',
  names: { en: 'Consoles', lv: 'Konsoles', ru: 'Приставки' },
  attributes: [
    {
      key: 'model',
      type: 'SELECT',
      required: true,
      unit: null,
      labels: { en: 'Model', lv: 'Modelis', ru: 'Модель' },
      options: [{ value: 'ps5', labels: { en: 'PS5', lv: 'PS5', ru: 'PS5' } }],
    },
    {
      key: 'controllers',
      type: 'NUMBER',
      required: false,
      unit: null,
      labels: { en: 'C', lv: 'C', ru: 'C' },
      options: null,
    },
  ],
  children: [],
};
const parent: CategoryNode = { ...leaf, id: 'cat-electronics', attributes: [], children: [leaf] };

const ready: ListingValues = {
  ...emptyValues(),
  categoryId: leaf.id,
  title: 'PlayStation 5',
  description: 'A PS5 with two controllers, ready for a weekend of games.',
  condition: 'GOOD',
  attributes: { model: 'ps5' },
  dailyCents: 1500,
  city: 'Rīga',
  district: 'Centrs',
  lat: 56.95,
  lng: 24.1,
};

describe('checkListing', () => {
  it('finds nothing wrong with a complete listing', () => {
    expect(checkListing(ready, 'submit', { category: leaf, photoCount: 1 })).toEqual({});
  });

  it('lets a draft be empty', () => {
    expect(checkListing(emptyValues(), 'draft', { photoCount: 0 })).toEqual({});
  });

  it('asks for every field the API requires before review', () => {
    const errors = checkListing(emptyValues(), 'submit', { photoCount: 0 });
    for (const field of [
      'title',
      'description',
      'condition',
      'categoryId',
      'dailyCents',
      'city',
      'district',
      'lat',
      'photos',
    ])
      expect(errors[field]?.key, field).toBeDefined();
  });

  it('measures texts like the API', () => {
    expect(
      checkListing({ ...ready, title: 'Bike' }, 'submit', { category: leaf, photoCount: 1 }).title,
    ).toEqual({
      key: 'tooShort',
      params: { min: 5 },
    });
    // Too long is refused even in a draft (the API would refuse it too).
    expect(checkListing({ ...ready, title: 'x'.repeat(81) }, 'draft', { photoCount: 0 }).title?.key).toBe(
      'tooLong',
    );
    // Markup does not count: the API cleans it away first.
    expect(
      checkListing({ ...ready, title: '<b>Bike</b>' }, 'submit', { category: leaf, photoCount: 1 }).title
        ?.key,
    ).toBe('tooShort');
  });

  it('checks the price with the same bounds as @yoyo/domain', () => {
    const at = (patch: Partial<ListingValues>) =>
      checkListing({ ...ready, ...patch }, 'draft', { photoCount: 0 });
    expect(at({ dailyCents: 50 }).dailyCents?.key).toBe('priceRange');
    expect(at({ dailyCents: Number.NaN }).dailyCents?.key).toBe('number');
    expect(at({ weeklyDiscountPercent: 95 }).weeklyDiscountPercent?.key).toBe('discountRange');
    expect(at({ depositCents: 6_000_000 }).depositCents?.key).toBe('depositRange');
    expect(at({ minDays: 0 }).minDays?.key).toBe('daysRange');
    expect(at({ minDays: 5, maxDays: 3 }).maxDays?.key).toBe('maxBelowMin');
  });

  it('agrees with validatePricing at the edges', () => {
    const { dailyCents } = PRICING_LIMITS;
    for (const value of [dailyCents.min - 1, dailyCents.min, dailyCents.max, dailyCents.max + 1]) {
      const pricing = {
        dailyCents: value,
        weeklyDiscountPercent: 0,
        depositCents: 0,
        minDays: 1,
        maxDays: 30,
      };
      let domainOk = true;
      try {
        validatePricing(pricing as never);
      } catch {
        domainOk = false;
      }
      const ours = checkListing({ ...ready, ...pricing }, 'submit', { category: leaf, photoCount: 1 });
      expect(ours.dailyCents === undefined, String(value)).toBe(domainOk);
    }
  });

  it('wants a subcategory and its required attributes', () => {
    expect(
      checkListing({ ...ready, categoryId: parent.id }, 'submit', { category: parent, photoCount: 1 })
        .categoryId?.key,
    ).toBe('chooseSubcategory');
    expect(
      checkListing({ ...ready, attributes: {} }, 'submit', { category: leaf, photoCount: 1 })[
        'attributes.model'
      ]?.key,
    ).toBe('required');
    expect(
      checkListing({ ...ready, attributes: { model: 'xbox' } }, 'draft', { category: leaf, photoCount: 0 })[
        'attributes.model'
      ]?.key,
    ).toBe('attribute');
  });

  it('checks own rules', () => {
    const errors = checkListing(
      { ...ready, rules: { preset: [], custom: ['ok', 'Return it charged'] } },
      'draft',
      { photoCount: 0 },
    );
    expect(errors['rules.custom.0']).toEqual({ key: 'tooShort', params: { min: 3 } });
    expect(errors['rules.custom.1']).toBeUndefined();
  });
});

describe('stepOf', () => {
  it('names the builder step of a field', () => {
    expect(stepOf('photos')).toBe('photos');
    expect(stepOf('attributes.model')).toBe('attributes');
    expect(stepOf('maxDays')).toBe('price');
    expect(stepOf('lat')).toBe('place');
    expect(stepOf('rules.custom.2')).toBe('rules');
    expect(stepOf('title')).toBe('basics');
  });
});
