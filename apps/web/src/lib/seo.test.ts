import { describe, expect, it } from 'vitest';
import { parseCatalogParams } from './catalog/params';
import { categoryAlternates, categorySeo, classifyPath, itemSeo, linkHeader, listingPath, localePath, profileSeo, searchSeo } from './seo';

const params = (search = '') => parseCatalogParams(new URLSearchParams(search));
const TOOLS = { en: 'tools', lv: 'instrumenti', ru: 'instrumenty' };

describe('item pages', () => {
  it('point at the address in the item’s own language from every language, and use it as the page language', () => {
    const listing = { id: 'cm1abcdefg', title: 'Spēļu konsole PS5', contentLocale: 'lv' as const };
    expect(itemSeo(listing, true)).toEqual({
      canonical: '/lv/listings/cm1abcdefg-spelu-konsole-ps5',
      htmlLang: 'lv',
      robots: { index: true, follow: true },
    });
    expect(itemSeo({ ...listing, contentLocale: 'en' }, true).canonical).toBe('/listings/cm1abcdefg-spelu-konsole-ps5');
  });

  it('an item away for now is not indexed', () => {
    expect(itemSeo({ id: 'cm1abcdefg', title: 'Drill', contentLocale: 'ru' }, false).robots).toEqual({ index: false, follow: true });
  });
});

describe('category pages', () => {
  it('are not indexed below 3 items, and stay followable', () => {
    expect(categorySeo({ slug: 'instrumenti', locale: 'lv', count: 2, params: params() })).toEqual({
      canonical: '/lv/c/instrumenti',
      robots: { index: false, follow: true },
    });
    expect(categorySeo({ slug: 'instrumenti', locale: 'lv', count: 3, params: params() }).robots.index).toBe(true);
  });

  it('with filters, a sort or the map point at the bare category and are not indexed', () => {
    for (const search of ['price_max=20', 'from=2026-12-01&to=2026-12-02', 'district=centrs', 'sort=price_asc', 'view=map', 'q=drill', 'price_min=5&page=2']) {
      expect(categorySeo({ slug: 'tools', locale: 'en', count: 50, params: params(search) }), search).toEqual({
        canonical: '/c/tools',
        robots: { index: false, follow: true },
      });
    }
  });

  it('a page number alone is indexed and points at itself', () => {
    expect(categorySeo({ slug: 'instrumenty', locale: 'ru', count: 50, params: params('page=2&utm_source=x') })).toEqual({
      canonical: '/ru/c/instrumenty?page=2',
      robots: { index: true, follow: true },
    });
  });

  it('has hreflang variants with each language’s own slug', () => {
    expect(categoryAlternates(TOOLS)).toEqual([
      { hreflang: 'en', path: '/c/tools' },
      { hreflang: 'lv', path: '/lv/c/instrumenti' },
      { hreflang: 'ru', path: '/ru/c/instrumenty' },
      { hreflang: 'x-default', path: '/c/tools' },
    ]);
    expect(linkHeader('https://yoyo.rent', categoryAlternates(TOOLS).slice(0, 2))).toBe(
      '<https://yoyo.rent/c/tools>; rel="alternate"; hreflang="en", <https://yoyo.rent/lv/c/instrumenti>; rel="alternate"; hreflang="lv"',
    );
  });
});

describe('search and profiles', () => {
  it('search is never indexed and keeps only the text in its canonical', () => {
    expect(searchSeo('lv', params('q=dr ill&price_max=5'))).toEqual({ canonical: '/lv/search?q=dr%20ill', robots: { index: false, follow: true } });
  });

  it('profiles point at English; an empty one is not indexed', () => {
    expect(profileSeo('u1', 2)).toEqual({ canonical: '/u/u1', robots: { index: true, follow: true } });
    expect(profileSeo('u1', 0).robots.index).toBe(false);
  });
});

describe('paths', () => {
  it('build locale and listing paths', () => {
    expect(localePath('en', '/')).toBe('/');
    expect(localePath('lv', '/')).toBe('/lv');
    expect(localePath('ru', '/c')).toBe('/ru/c');
    expect(listingPath('abc', 'PlayStation 5!')).toBe('/listings/abc-playstation-5');
  });

  it('tell the proxy what a page is', () => {
    expect(classifyPath('/lv/listings/cm1abcdefg-ps5')).toEqual({ kind: 'listing', locale: 'lv', id: 'cm1abcdefg', slug: 'ps5' });
    expect(classifyPath('/listings/cm1abcdefg')).toEqual({ kind: 'listing', locale: 'en', id: 'cm1abcdefg', slug: '' });
    expect(classifyPath('/listings/new')).toEqual({ kind: 'other' });
    expect(classifyPath('/listings/cm1abcdefg/edit')).toEqual({ kind: 'other' });
    expect(classifyPath('/ru/u/user1')).toEqual({ kind: 'profile', locale: 'ru' });
    expect(classifyPath('/lv/c/instrumenti')).toEqual({ kind: 'category', locale: 'lv', slug: 'instrumenti' });
    expect(classifyPath('/c')).toEqual({ kind: 'other' });
  });
});
