import { describe, expect, it } from 'vitest';
import { legacyHostRedirects } from './legacy-redirects';

describe('legacyHostRedirects', () => {
  it('sends every path of each legacy host permanently to the same path on the site origin', () => {
    expect(legacyHostRedirects('https://yoyo.rent', 'yoyo-rent.vercel.app, www.yoyo.rent')).toEqual([
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'yoyo-rent\\.vercel\\.app' }],
        destination: 'https://yoyo.rent/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www\\.yoyo\\.rent' }],
        destination: 'https://yoyo.rent/:path*',
        permanent: true,
      },
    ]);
  });

  it('does nothing unless both are set, so previews and local dev are untouched', () => {
    expect(legacyHostRedirects(undefined, undefined)).toEqual([]);
    expect(legacyHostRedirects('https://yoyo.rent', undefined)).toEqual([]);
    expect(legacyHostRedirects('', 'yoyo-rent.vercel.app')).toEqual([]);
    expect(legacyHostRedirects('https://yoyo.rent', ' , ')).toEqual([]);
  });

  it('normalizes the origin and the hosts, and never redirects the site to itself', () => {
    const [rule, ...rest] = legacyHostRedirects('https://yoyo.rent/', ' Yoyo-Rent.Vercel.App ,yoyo.rent');
    expect(rest).toEqual([]);
    expect(rule).toMatchObject({ has: [{ value: 'yoyo-rent\\.vercel\\.app' }], destination: 'https://yoyo.rent/:path*' });
  });

  it('refuses a SITE_ORIGIN that is not an http(s) URL', () => {
    expect(() => legacyHostRedirects('yoyo.rent', 'yoyo-rent.vercel.app')).toThrow(/SITE_ORIGIN/);
  });
});
