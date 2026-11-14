import { afterEach, describe, expect, it } from 'vitest';
import { LOCALE_COOKIE_MAX_AGE, readLocaleChoice, suggestLocale, writeLocaleChoice } from './choice';

afterEach(() => {
  document.cookie = 'NEXT_LOCALE=; path=/; max-age=0';
});

describe('suggestLocale', () => {
  it('suggests the first preferred language the site has, when the page is in another one', () => {
    expect(suggestLocale(['lv-LV', 'en'], 'en')).toBe('lv');
    expect(suggestLocale(['de-DE', 'ru'], 'lv')).toBe('ru');
    expect(suggestLocale(['RU'], 'en')).toBe('ru');
  });

  it('suggests nothing when the page already is in the preferred language', () => {
    expect(suggestLocale(['en-GB', 'lv'], 'en')).toBeNull();
    expect(suggestLocale(['lv', 'ru'], 'lv')).toBeNull();
  });

  it('suggests nothing when the browser prefers no language the site has', () => {
    expect(suggestLocale(['de', 'fr-FR'], 'en')).toBeNull();
    expect(suggestLocale([], 'en')).toBeNull();
  });
});

describe('the NEXT_LOCALE cookie', () => {
  it('is empty until a choice is written, then reads back for a year', () => {
    expect(readLocaleChoice()).toBeNull();
    writeLocaleChoice('ru');
    expect(readLocaleChoice()).toBe('ru');
    expect(LOCALE_COOKIE_MAX_AGE).toBe(31_536_000);
  });

  it('ignores a value that is not a supported language', () => {
    expect(readLocaleChoice('NEXT_LOCALE=de; yoyo-theme=dark')).toBeNull();
    expect(readLocaleChoice('yoyo-theme=dark; NEXT_LOCALE=lv')).toBe('lv');
  });
});
