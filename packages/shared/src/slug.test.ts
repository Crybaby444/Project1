import { describe, expect, it } from 'vitest';
import { listingSlug, slugify, splitListingParam } from './slug';

describe('slugify', () => {
  it('drops diacritics, transliterates Russian and joins words with hyphens', () => {
    expect(slugify('Spēļu konsoles')).toBe('spelu-konsoles');
    expect(slugify('Инструменты')).toBe('instrumenty');
    expect(slugify('Игровые приставки')).toBe('igrovye-pristavki');
    expect(slugify('Car & travel')).toBe('car-travel');
    expect(slugify('  Žūrijas Ķēde! ')).toBe('zurijas-kede');
    expect(slugify('Vecrīga')).toBe('vecriga');
  });
});

describe('listingSlug', () => {
  it('comes from the title, at most 60 characters, never ending on a hyphen', () => {
    expect(listingSlug('PlayStation 5 for the weekend')).toBe('playstation-5-for-the-weekend');
    const long = listingSlug('Bosch professional cordless hammer drill with two batteries and a case for concrete');
    expect(long.length).toBeLessThanOrEqual(60);
    expect(long).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(long.startsWith('bosch-professional-cordless')).toBe(true);
    expect(listingSlug('Дрель Bosch')).toBe('drel-bosch');
    expect(listingSlug('!!!')).toBe('item');
  });
});

describe('splitListingParam', () => {
  it('splits at the first hyphen', () => {
    expect(splitListingParam('cm1abc-playstation-5')).toEqual({ id: 'cm1abc', slug: 'playstation-5' });
    expect(splitListingParam('cm1abc')).toEqual({ id: 'cm1abc', slug: '' });
  });
});
