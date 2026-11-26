import { describe, expect, it } from 'vitest';
import { manifestFor, manifestHref } from './manifest';

describe('the web app manifest', () => {
  it('is one installable app for every language, opening in its own', () => {
    for (const locale of ['en', 'lv', 'ru'] as const) {
      const m = manifestFor(locale);
      expect(m).toMatchObject({ id: '/', scope: '/', display: 'standalone', short_name: 'Yoyo', lang: locale });
      expect(m.icons?.some((i) => i.purpose === 'maskable' && i.sizes === '512x512')).toBe(true);
      expect(m.icons?.some((i) => i.purpose === 'any' && i.sizes === '192x192')).toBe(true);
    }
    expect(manifestFor('en').start_url).toBe('/?source=pwa');
    expect(manifestFor('ru').start_url).toBe('/ru?source=pwa');
    expect(manifestFor('lv').shortcuts?.map((s) => s.url)).toEqual(['/lv/c', '/lv/listings/new', '/lv/bookings', '/lv/messages']);
  });

  it('is linked per language', () => {
    expect(manifestHref('en')).toBe('/manifest.webmanifest');
    expect(manifestHref('ru')).toBe('/ru/manifest.webmanifest');
  });
});
