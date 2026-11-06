import { describe, expect, it } from 'vitest';
import { CategoryNodeSchema, validateAttributes, type AttributeDef } from './categories';

const labels = (en: string) => ({ en, lv: en, ru: en });

const DEFS: AttributeDef[] = [
  {
    key: 'model',
    type: 'SELECT',
    required: true,
    unit: null,
    labels: labels('Model'),
    options: [
      { value: 'ps5', labels: labels('PlayStation 5') },
      { value: 'switch', labels: labels('Nintendo Switch') },
    ],
  },
  { key: 'controllers', type: 'NUMBER', required: true, unit: null, labels: labels('Controllers'), options: null },
  { key: 'games', type: 'TEXT', required: false, unit: null, labels: labels('Games included'), options: null },
  { key: 'case', type: 'BOOLEAN', required: false, unit: null, labels: labels('Case included'), options: null },
];

describe('validateAttributes', () => {
  it('accepts valid values and returns them cleaned', () => {
    const result = validateAttributes(
      { model: 'ps5', controllers: 2, games: '  <b>FIFA</b> and Gran Turismo ', case: false },
      DEFS,
      'submit',
    );
    expect(result).toEqual({
      ok: true,
      value: { model: 'ps5', controllers: 2, games: 'FIFA and Gran Turismo', case: false },
    });
  });

  it('names every broken attribute: missing required, a number sent as text, an option not in the list, an unknown key', () => {
    const result = validateAttributes({ model: 'xbox', controllers: '2', drill: 'yes' }, DEFS, 'submit');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.fields).sort()).toEqual(['attributes.controllers', 'attributes.drill', 'attributes.model']);

    const missing = validateAttributes({ controllers: 2 }, DEFS, 'submit');
    expect(missing).toEqual({ ok: false, fields: { 'attributes.model': expect.any(String) } });
  });

  it('lets a draft skip required attributes, but never accepts a key of another category', () => {
    expect(validateAttributes({ games: 'FIFA' }, DEFS, 'draft')).toEqual({ ok: true, value: { games: 'FIFA' } });
    const foreign = validateAttributes({ power: 'battery' }, DEFS, 'draft');
    expect(foreign).toEqual({ ok: false, fields: { 'attributes.power': expect.any(String) } });
  });

  it('drops empty values (null, blank text) instead of storing them', () => {
    expect(validateAttributes({ games: '   ', case: null }, DEFS, 'draft')).toEqual({ ok: true, value: {} });
    expect(validateAttributes({ model: '' }, DEFS, 'submit')).toMatchObject({ ok: false });
  });

  it('refuses wrong types for booleans and numbers that are not finite', () => {
    const result = validateAttributes({ case: 'yes', controllers: Number.NaN }, DEFS, 'draft');
    expect(result).toEqual({
      ok: false,
      fields: { 'attributes.case': expect.any(String), 'attributes.controllers': expect.any(String) },
    });
  });

  it('refuses something that is not an object', () => {
    expect(validateAttributes(['ps5'] as unknown as Record<string, unknown>, DEFS, 'draft')).toEqual({
      ok: false,
      fields: { attributes: expect.any(String) },
    });
  });
});

describe('CategoryNodeSchema', () => {
  it('parses a nested tree', () => {
    const leaf = { id: 'c2', slug: 'game-consoles', sticker: 'blue', icon: 'gamepad', names: labels('Consoles'), slugs: labels('consoles'), attributes: DEFS, children: [] };
    const root = { ...leaf, id: 'c1', slug: 'electronics', attributes: [], children: [leaf] };
    expect(CategoryNodeSchema.parse(root).children[0]!.slug).toBe('game-consoles');
  });
});
