import { describe, expect, it } from 'vitest';
import type { CategoryNode } from '@yoyo/shared';
import { effectiveSort, escapeLike, fold, searchWords, stemOf, textWords, vocabularyOf, whereSql } from './catalog-query';

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
      text: textWords(evil, []),
      districts: ['Centrs'], cities: null,
    });
    expect(sql.sql).not.toContain('DROP');
    expect(sql.sql).not.toContain('Centrs');
    expect(sql.values).toEqual(expect.arrayContaining(['drop', '%drop%', 'table', 'c1', 'Centrs', 100, 3]));
  });

  it('an unknown category or district finds nothing instead of everything', () => {
    expect(whereSql({ page: 1 }, { categoryIds: [], text: [], districts: null, cities: null }).sql).toContain('FALSE');
  });

  it('splits a search text into folded words, leaving out the shortest', () => {
    expect(searchWords('Дрель  Bosch, и PS5!')).toEqual(['дрель', 'bosch', 'ps5']);
    expect(searchWords('Urbjmašīna')).toEqual(['urbjmasina']);
    expect(searchWords('tv')).toEqual([]);
  });

  it('stems a word past the endings Russian, Latvian and English put on it', () => {
    expect(stemOf('дрель')).toBe('дрел');
    expect('дрели и шуруповерты'.includes(stemOf('дрели'))).toBe(true);
    expect('палатки'.includes(stemOf('палатка'))).toBe(true);
    expect('urbjmasinas un skruvgriezi'.includes(stemOf('urbjmasina'))).toBe(true);
    expect('drills'.includes(stemOf('drill'))).toBe(true);
    expect(stemOf('стол')).toBe('стол');
  });

  it('lets a category answer to its names and the kinds it holds, in every language, never to "Other"', () => {
    const cycling: CategoryNode = {
      id: 'c-cycling',
      slug: 'cycling',
      sticker: 'blue',
      icon: 'bike',
      names: { en: 'Cycling', lv: 'Riteņbraukšana', ru: 'Велоспорт' },
      slugs: { en: 'cycling', lv: 'ritenbrauksana', ru: 'velosport' },
      attributes: [
        {
          key: 'type',
          type: 'SELECT',
          required: true,
          unit: null,
          labels: { en: 'Type', lv: 'Veids', ru: 'Тип' },
          options: [
            { value: 'city', labels: { en: 'City bike', lv: 'Pilsētas velosipēds', ru: 'Городской велосипед' } },
            { value: 'other', labels: { en: 'Other', lv: 'Cits', ru: 'Другое' } },
          ],
        },
        { key: 'frameSize', type: 'TEXT', required: false, unit: null, labels: { en: 'Frame', lv: 'Rāmis', ru: 'Рама' }, options: null },
      ],
      children: [],
    };
    const vocabulary = vocabularyOf(cycling);
    // Folded like yoyo_fold: no marks, so «й» reads as «и» on both sides of a match.
    expect(vocabulary).toEqual(expect.arrayContaining(['cycling', 'ritenbrauksana', 'велоспорт', 'городскои велосипед', 'pilsetas velosipeds']));
    expect(vocabulary).not.toContain('другое');
    expect(vocabulary).not.toContain('рама');

    const categories = [{ ids: ['c-cycling'], vocabulary }];
    // A Russian «велосипеды» finds the category of a bike listed in Latvian; «Bosch» names no category.
    expect(textWords('велосипеды Bosch', categories)).toEqual([
      { word: 'велосипеды', stem: 'велосипе', categoryIds: ['c-cycling'] },
      { word: 'bosch', stem: 'bosc', categoryIds: [] },
    ]);
    expect(textWords('другое', categories)[0]!.categoryIds).toEqual([]);
    // Only short words: the text is taken whole.
    expect(textWords('TV', categories)).toEqual([{ word: 'tv', stem: 'tv', categoryIds: [] }]);
  });

  it('sorts by relevance only when there is a search text', () => {
    expect(effectiveSort({ page: 1 })).toBe('new');
    expect(effectiveSort({ page: 1, q: 'drill' })).toBe('relevance');
    expect(effectiveSort({ page: 1, sort: 'relevance' })).toBe('new');
    expect(effectiveSort({ page: 1, q: 'drill', sort: 'price_asc' })).toBe('price_asc');
  });
});
