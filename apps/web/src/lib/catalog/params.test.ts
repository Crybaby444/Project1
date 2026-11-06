import { describe, expect, it } from 'vitest';
import { catalogSearch, filterCount, hasFilters, parseCatalogParams, toApiQuery } from './params';

const parse = (search: string) => parseCatalogParams(new URLSearchParams(search));

describe('parseCatalogParams', () => {
  it('reads only the W03 parameters', () => {
    expect(parse('q=drill&price_min=5&price_max=20&from=2026-12-01&to=2026-12-03&district=centrs&sort=price_asc&view=map&page=2&utm_source=x&gclid=y')).toEqual({
      q: 'drill',
      priceMin: 5,
      priceMax: 20,
      from: '2026-12-01',
      to: '2026-12-03',
      district: 'centrs',
      sort: 'price_asc',
      view: 'map',
      page: 2,
    });
  });

  it('drops a broken parameter and keeps the rest', () => {
    expect(parse('price_min=abc&district=centrs')).toEqual({ district: 'centrs', page: 1, view: 'list' });
    expect(parse('from=2026-12-01')).toEqual({ page: 1, view: 'list' });
    expect(parse('from=2026-12-05&to=2026-12-01')).toEqual({ page: 1, view: 'list' });
    expect(parse('from=2026-02-30&to=2026-03-02')).toEqual({ page: 1, view: 'list' });
    expect(parse('price_min=50&price_max=10')).toEqual({ priceMin: 50, page: 1, view: 'list' });
    expect(parse('sort=cheapest&page=0&district=Centrs&view=grid')).toEqual({ page: 1, view: 'list' });
  });
});

describe('catalogSearch', () => {
  it('writes defaults out and resets the page when a filter changes', () => {
    const params = parse('page=3&district=centrs');
    expect(catalogSearch(params, { priceMax: 20 })).toBe('?price_max=20&district=centrs');
    expect(catalogSearch(params, { page: 4 })).toBe('?district=centrs&page=4');
    expect(catalogSearch(parse('sort=new&view=list'))).toBe('?sort=new');
    expect(catalogSearch(parse(''))).toBe('');
    expect(catalogSearch(parse('view=map&q=dril'), { q: 'drill' })).toBe('?q=drill&view=map');
  });

  it('gives one selection one address whatever order it was typed in', () => {
    expect(catalogSearch(parse('district=centrs&q=x'))).toBe(catalogSearch(parse('q=x&district=centrs')));
  });
});

describe('filters', () => {
  it('knows what narrows the results', () => {
    expect(hasFilters(parse('page=2'))).toBe(false);
    expect(hasFilters(parse('sort=new'))).toBe(true);
    expect(hasFilters(parse('view=map'))).toBe(true);
    expect(filterCount(parse('price_min=1&price_max=5&from=2026-12-01&to=2026-12-02&sort=price_asc'))).toBe(2);
  });

  it('turns euros into the API’s cents and dates into start and end', () => {
    expect(toApiQuery(parse('price_min=5&price_max=20&from=2026-12-01&to=2026-12-03&page=2'), 'tools')).toEqual({
      page: 2,
      category: 'tools',
      priceMin: 500,
      priceMax: 2000,
      start: '2026-12-01',
      end: '2026-12-03',
    });
  });
});
