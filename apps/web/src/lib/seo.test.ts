import { describe, expect, it } from 'vitest';
import { alternates, localizedPath, pageMetadata } from './seo';

describe('localizedPath', () => {
  it('keeps English without a prefix and prefixes the others', () => {
    expect(localizedPath('en', '/')).toBe('/');
    expect(localizedPath('lv', '/')).toBe('/lv');
    expect(localizedPath('ru', '/faq')).toBe('/ru/faq');
    expect(localizedPath('en', '/terms')).toBe('/terms');
  });
});

describe('alternates', () => {
  it('points canonical at this language and lists every language plus x-default', () => {
    expect(alternates('/faq', 'lv', 'https://yoyo.rent')).toEqual({
      canonical: 'https://yoyo.rent/lv/faq',
      languages: {
        en: 'https://yoyo.rent/faq',
        lv: 'https://yoyo.rent/lv/faq',
        ru: 'https://yoyo.rent/ru/faq',
        'x-default': 'https://yoyo.rent/faq',
      },
    });
  });

  it('writes the home page without a trailing slash for other languages', () => {
    expect(alternates('/', 'en', 'https://yoyo.rent').languages).toEqual({
      en: 'https://yoyo.rent/',
      lv: 'https://yoyo.rent/lv',
      ru: 'https://yoyo.rent/ru',
      'x-default': 'https://yoyo.rent/',
    });
  });
});

describe('pageMetadata', () => {
  it('fills title, description, alternates, Open Graph and the Twitter card', () => {
    const meta = pageMetadata({
      locale: 'lv',
      path: '/privacy',
      title: 'Privātums',
      description: 'Kā mēs apstrādājam datus.',
      siteUrl: 'https://yoyo.rent',
    });
    expect(meta.title).toBe('Privātums');
    expect(meta.description).toBe('Kā mēs apstrādājam datus.');
    expect(meta.alternates?.canonical).toBe('https://yoyo.rent/lv/privacy');
    expect(meta.openGraph).toMatchObject({
      type: 'website',
      siteName: 'Yoyo',
      locale: 'lv_LV',
      alternateLocale: ['en_US', 'ru_RU'],
      url: 'https://yoyo.rent/lv/privacy',
      title: 'Privātums',
      description: 'Kā mēs apstrādājam datus.',
    });
    expect(meta.twitter).toMatchObject({ card: 'summary_large_image', title: 'Privātums' });
  });
});
