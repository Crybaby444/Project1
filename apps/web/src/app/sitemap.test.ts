import type { SitemapResponse } from '@yoyo/shared';
import { describe, expect, it } from 'vitest';
import { categoryUrls, listingUrls, pageUrls, sitemapIndex, urlset } from '@/lib/sitemaps';
import robots from './robots';

const SITE = 'https://yoyo.rent';

describe('sitemap.xml', () => {
  it('is an index of the pages, the categories and the items', () => {
    const xml = sitemapIndex(SITE);
    expect(xml).toContain('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml.match(/<loc>[^<]+<\/loc>/g)).toEqual([
      `<loc>${SITE}/sitemap-pages.xml</loc>`,
      `<loc>${SITE}/sitemap-categories.xml</loc>`,
      `<loc>${SITE}/sitemap-listings.xml</loc>`,
    ]);
  });
});

describe('sitemap-pages.xml', () => {
  it('lists every public page in every language, each with its language alternates', () => {
    const urls = pageUrls(SITE);
    expect(urls).toHaveLength(18);
    expect(urls.map((url) => url.loc)).toEqual(expect.arrayContaining([SITE, `${SITE}/lv`, `${SITE}/ru/privacy`]));
    expect(urls.find((url) => url.loc === `${SITE}/lv/faq`)?.alternates).toEqual({
      en: `${SITE}/faq`,
      lv: `${SITE}/lv/faq`,
      ru: `${SITE}/ru/faq`,
      'x-default': `${SITE}/faq`,
    });
    expect(urls.some((url) => /login|register|settings|styleguide/.test(url.loc))).toBe(false);
    expect(urlset(urls)).toContain(`<xhtml:link rel="alternate" hreflang="ru" href="${SITE}/ru/privacy"/>`);
  });
});

const CATEGORIES: SitemapResponse['categories'] = [
  { slug: 'tools', slugs: { en: 'tools', lv: 'instrumenti', ru: 'instrumenty' }, count: 3 },
  { slug: 'drills-drivers', slugs: { en: 'drills-drivers', lv: 'urbjmasinas', ru: 'dreli' }, count: 2 },
  { slug: 'other', slugs: { en: 'other', lv: 'citi', ru: 'drugoe' }, count: 0 },
];

describe('sitemap-categories.xml', () => {
  it('lists the catalog index and only categories with at least 3 items, each language at its own slug', () => {
    expect(categoryUrls(SITE, CATEGORIES).map((url) => url.loc)).toEqual([
      `${SITE}/c`,
      `${SITE}/lv/c`,
      `${SITE}/ru/c`,
      `${SITE}/c/tools`,
      `${SITE}/lv/c/instrumenti`,
      `${SITE}/ru/c/instrumenty`,
    ]);
  });
});

describe('sitemap-listings.xml', () => {
  it('lists each item once, at its canonical address in its own language, with loc and lastmod only', () => {
    const urls = listingUrls(SITE, [
      { id: 'cm1abcdefg', slug: 'spelu-konsole-ps5', contentLocale: 'lv', updatedAt: '2026-11-04T10:00:00.000Z' },
      { id: 'cm2abcdefg', slug: 'drill', contentLocale: 'en', updatedAt: '2026-11-05T10:00:00.000Z' },
    ]);
    const xml = urlset(urls);
    expect(xml).toContain(`<url><loc>${SITE}/lv/listings/cm1abcdefg-spelu-konsole-ps5</loc><lastmod>2026-11-04</lastmod></url>`);
    expect(xml).toContain(`<url><loc>${SITE}/listings/cm2abcdefg-drill</loc><lastmod>2026-11-05</lastmod></url>`);
    expect(xml).not.toContain('xhtml');
  });

  it('escapes what XML needs escaped', () => {
    expect(urlset([{ loc: `${SITE}/search?q=a&b` }])).toContain('<loc>https://yoyo.rent/search?q=a&amp;b</loc>');
  });
});

describe('robots.txt', () => {
  it('lets search engines in, keeps them out of the API and private screens, and points at the sitemap', () => {
    const rules = robots();
    const rule = Array.isArray(rules.rules) ? rules.rules[0]! : rules.rules;
    expect(rule.userAgent).toBe('*');
    expect(rule.allow).toBe('/');
    expect(rule.disallow).toEqual(
      expect.arrayContaining(['/api/', '/settings', '/lv/settings', '/ru/settings', '/styleguide', '/dashboard', '/ru/dashboard', '/admin', '/listings/new']),
    );
    expect(rules.sitemap).toBe('https://yoyo.rent/sitemap.xml');
  });
});
