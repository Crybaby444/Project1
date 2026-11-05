import { describe, expect, it } from 'vitest';
import { CATALOG_PAGE_SIZE, CatalogQuerySchema, SuggestQuerySchema } from './catalog';

const parse = (input: Record<string, string>) => CatalogQuerySchema.safeParse(input);
const fieldsOf = (input: Record<string, string>) => {
  const result = parse(input);
  if (result.success) return [];
  return result.error.issues.map((issue) => issue.path.join('.'));
};

describe('CatalogQuerySchema', () => {
  it('reads numbers and the condition list from query strings, page 1 by default', () => {
    expect(parse({ priceMin: '500', condition: 'NEW,GOOD' }).data).toEqual({
      priceMin: 500,
      condition: ['NEW', 'GOOD'],
      page: 1,
    });
  });

  it('accepts an empty query', () => {
    expect(parse({}).data).toEqual({ page: 1 });
  });

  it('needs both dates, the end not before the start', () => {
    expect(fieldsOf({ start: '2026-12-01' })).toEqual(['end']);
    expect(fieldsOf({ end: '2026-12-01' })).toEqual(['start']);
    expect(fieldsOf({ start: '2026-12-05', end: '2026-12-01' })).toEqual(['end']);
    expect(parse({ start: '2026-12-01', end: '2026-12-01' }).success).toBe(true);
  });

  it('refuses days that do not exist and periods longer than a year', () => {
    expect(fieldsOf({ start: '2026-02-30', end: '2026-03-02' })).toContain('start');
    expect(fieldsOf({ start: '2026-01-01', end: '2027-01-01' })).toEqual(['end']);
    expect(parse({ start: '2026-01-01', end: '2026-12-31' }).success).toBe(true);
  });

  it('keeps the price range in order', () => {
    expect(fieldsOf({ priceMin: '900', priceMax: '100' })).toEqual(['priceMax']);
    expect(fieldsOf({ priceMin: '-1' })).toEqual(['priceMin']);
    expect(fieldsOf({ priceMin: '12.5' })).toEqual(['priceMin']);
  });

  it('cleans markup out of the search text and drops an empty one', () => {
    expect(parse({ q: ' <b>drill</b> ' }).data?.q).toBe('drill');
    expect(parse({ q: '   ' }).data?.q).toBeUndefined();
  });

  it('knows only its own sorts and conditions', () => {
    expect(fieldsOf({ sort: 'cheapest' })).toEqual(['sort']);
    expect(fieldsOf({ condition: 'NEW,BROKEN' })).toEqual(['condition.1']);
    expect(parse({ sort: 'price_asc' }).data?.sort).toBe('price_asc');
  });

  it('caps the page', () => {
    expect(fieldsOf({ page: '0' })).toEqual(['page']);
    expect(parse({ page: '3' }).data?.page).toBe(3);
    expect(CATALOG_PAGE_SIZE).toBe(24);
  });
});

describe('SuggestQuerySchema', () => {
  it('needs at least two characters', () => {
    expect(SuggestQuerySchema.safeParse({ q: 'a' }).success).toBe(false);
    expect(SuggestQuerySchema.safeParse({ q: 'ab' }).data).toEqual({ q: 'ab', lang: 'en' });
    expect(SuggestQuerySchema.safeParse({ q: 'dr', lang: 'ru' }).data).toEqual({ q: 'dr', lang: 'ru' });
  });
});
