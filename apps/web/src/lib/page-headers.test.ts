import type { CategoryNode } from '@yoyo/shared';
import { describe, expect, it } from 'vitest';
import { decidePage, type Lookups } from './page-headers';

const tools: CategoryNode = {
  id: 'c1',
  slug: 'tools',
  slugs: { en: 'tools', lv: 'instrumenti', ru: 'instrumenty' },
  sticker: 'sun',
  icon: 'x',
  names: { en: 'Tools', lv: 'Instrumenti', ru: 'Инструменты' },
  attributes: [],
  children: [],
};

const lookups = (status = 200): Lookups => ({
  address: async () => (status === 200 ? { status: 200, data: { slug: 'ps5-weekend', contentLocale: 'lv', available: true } } : { status }),
  categories: async () => [tools],
});

const decide = (path: string, search = '', l = lookups()) => decidePage(path, search, 'https://yoyo.rent', l);

describe('decidePage', () => {
  it('sends a missing or wrong listing slug to the right one with 301, keeping the language and query', async () => {
    expect(await decide('/ru/listings/cm1abcdefg', '?from=2026-12-01')).toEqual({ action: 'redirect', location: '/ru/listings/cm1abcdefg-ps5-weekend?from=2026-12-01' });
    expect(await decide('/listings/cm1abcdefg-old-title')).toEqual({ action: 'redirect', location: '/listings/cm1abcdefg-ps5-weekend' });
  });

  it('renders the right listing address without hreflang, in the item’s language', async () => {
    expect(await decide('/ru/listings/cm1abcdefg-ps5-weekend')).toEqual({ action: 'render', link: 'drop', contentLocale: 'lv' });
  });

  it('answers 410 for a removed listing and lets a never-public one reach its 404', async () => {
    expect(await decide('/lv/listings/cm1abcdefg-x', '', lookups(410))).toEqual({ action: 'gone', locale: 'lv' });
    expect(await decide('/listings/cm1abcdefg-x', '', lookups(404))).toEqual({ action: 'render', link: 'drop' });
  });

  it('drops hreflang on profiles', async () => {
    expect(await decide('/lv/u/user1')).toEqual({ action: 'render', link: 'drop' });
  });

  it('gives categories hreflang with each language’s slug, and moves a foreign slug to the right one', async () => {
    const decision = await decide('/lv/c/instrumenti');
    expect(decision).toEqual({
      action: 'render',
      link: '<https://yoyo.rent/c/tools>; rel="alternate"; hreflang="en", <https://yoyo.rent/lv/c/instrumenti>; rel="alternate"; hreflang="lv", <https://yoyo.rent/ru/c/instrumenty>; rel="alternate"; hreflang="ru", <https://yoyo.rent/c/tools>; rel="alternate"; hreflang="x-default"',
    });
    expect(await decide('/lv/c/tools', '?page=2')).toEqual({ action: 'redirect', location: '/lv/c/instrumenti?page=2' });
    expect(await decide('/c/nothing')).toEqual({ action: 'render', link: 'drop' });
  });

  it('leaves other pages to next-intl', async () => {
    expect(await decide('/lv/c')).toEqual({ action: 'render', link: 'keep' });
    expect(await decide('/')).toEqual({ action: 'render', link: 'keep' });
    expect(await decide('/listings/new')).toEqual({ action: 'render', link: 'keep' });
  });
});
