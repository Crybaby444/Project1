import { describe, expect, it } from 'vitest';
import { hitFor } from './page-counter';

describe('hitFor', () => {
  it('marks the first page of a visit with where it came from, and never our own site', () => {
    expect(hitFor({ path: '/lv/c', first: true, referrer: 'https://www.google.com/', origin: 'https://yoyo.rent', locale: 'lv' })).toEqual({
      path: '/lv/c', entry: true, referrer: 'https://www.google.com/', locale: 'lv',
    });
    // A full reload or a link from our own pages is not a new visit.
    expect(hitFor({ path: '/lv/c', first: true, referrer: 'https://yoyo.rent/lv', origin: 'https://yoyo.rent', locale: 'lv' })).toMatchObject({ entry: false, referrer: '' });
    expect(hitFor({ path: '/lv/c', first: true, referrer: '', origin: 'https://yoyo.rent', locale: 'lv' })).toMatchObject({ entry: true, referrer: '' });
    expect(hitFor({ path: '/lv/faq', first: false, referrer: 'https://www.google.com/', origin: 'https://yoyo.rent', locale: 'lv' })).toMatchObject({ entry: false, referrer: '' });
  });

  it('adds a search shown on the page', () => {
    expect(hitFor({ path: '/search', first: false, referrer: '', origin: 'https://yoyo.rent', locale: 'en', search: { q: 'drill', results: 0 } }).search).toEqual({ q: 'drill', results: 0 });
  });
});
