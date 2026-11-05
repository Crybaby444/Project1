import { describe, expect, it } from 'vitest';
import { CONTACT_EMAIL, PAGES, resolveSiteUrl } from './site';

describe('resolveSiteUrl', () => {
  it('uses SITE_ORIGIN without a trailing slash', () => {
    expect(resolveSiteUrl('https://yoyo.rent/')).toBe('https://yoyo.rent');
    expect(resolveSiteUrl('  http://localhost:3000 ')).toBe('http://localhost:3000');
  });

  it('falls back to the live domain when it is not set', () => {
    expect(resolveSiteUrl(undefined)).toBe('https://yoyo.rent');
    expect(resolveSiteUrl('')).toBe('https://yoyo.rent');
  });
});

describe('site pages', () => {
  it('lists the public pages, home first', () => {
    expect(PAGES).toEqual(['/', '/how-it-works', '/faq', '/terms', '/privacy', '/cookies']);
  });

  it('has one contact address', () => {
    expect(CONTACT_EMAIL).toBe('admin@yoyo.rent');
  });
});
