import { describe, expect, it } from 'vitest';
import robots from './robots';
import sitemap from './sitemap';

describe('sitemap.xml', () => {
  it('lists every public page in every language, without repeating the hreflang alternates', () => {
    const entries = sitemap();
    expect(entries).toHaveLength(18);
    const urls = entries.map((entry) => entry.url);
    expect(urls).toContain('https://yoyo.rent');
    expect(urls).toContain('https://yoyo.rent/lv');
    expect(urls).toContain('https://yoyo.rent/ru/privacy');
    expect(urls).toContain('https://yoyo.rent/lv/faq');
    // Each page sends its alternates in the Link header (and its <head>); the sitemap does not.
    expect(entries.every((entry) => entry.alternates === undefined)).toBe(true);
  });

  it('leaves out account screens and the styleguide', () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(urls.some((url) => /login|register|settings|styleguide/.test(url))).toBe(false);
  });
});

describe('robots.txt', () => {
  it('lets search engines in, keeps them out of the API and private screens, and points at the sitemap', () => {
    const rules = robots();
    const rule = Array.isArray(rules.rules) ? rules.rules[0]! : rules.rules;
    expect(rule.userAgent).toBe('*');
    expect(rule.allow).toBe('/');
    expect(rule.disallow).toEqual(
      expect.arrayContaining(['/api/', '/settings', '/lv/settings', '/ru/settings', '/styleguide']),
    );
    expect(rules.sitemap).toBe('https://yoyo.rent/sitemap.xml');
  });
});
