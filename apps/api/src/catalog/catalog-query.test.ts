import { describe, expect, it } from 'vitest';
import { effectiveSort, escapeLike, fold, whereSql } from './catalog-query';

describe('catalog query building', () => {
  it('escapes LIKE wildcards so they match themselves', () => {
    expect(escapeLike('50%_off\\')).toBe('50\\%\\_off\\\\');
  });

  it('folds like yoyo_fold', () => {
    expect(fold('Velosipēds ŠŪ')).toBe('velosipeds su');
  });

  it('keeps every value out of the SQL text (Review Focus 2)', () => {
    const evil = "'; DROP TABLE \"Listing\"; --";
    const sql = whereSql({ q: evil, page: 1, priceMin: 100, start: '2026-12-01', end: '2026-12-03' }, {
      categoryIds: ['c1'],
      textCategoryIds: [],
      districts: ['Centrs'],
    });
    expect(sql.sql).not.toContain('DROP');
    expect(sql.sql).not.toContain('Centrs');
    expect(sql.values).toEqual(expect.arrayContaining([evil, 'c1', 'Centrs', 100, 3]));
  });

  it('an unknown category or district finds nothing instead of everything', () => {
    expect(whereSql({ page: 1 }, { categoryIds: [], textCategoryIds: [], districts: null }).sql).toContain('FALSE');
  });

  it('sorts by relevance only when there is a search text', () => {
    expect(effectiveSort({ page: 1 })).toBe('new');
    expect(effectiveSort({ page: 1, q: 'drill' })).toBe('relevance');
    expect(effectiveSort({ page: 1, sort: 'relevance' })).toBe('new');
    expect(effectiveSort({ page: 1, q: 'drill', sort: 'price_asc' })).toBe('price_asc');
  });
});
