import { describe, expect, it } from 'vitest';
import { DEFAULT_LOCALE, LOCALES, isLocale } from './locale';

describe('locales', () => {
  it('supports English, Latvian and Russian with English as the default', () => {
    expect(LOCALES).toEqual(['en', 'lv', 'ru']);
    expect(DEFAULT_LOCALE).toBe('en');
  });

  it('accepts only exact lowercase supported codes', () => {
    expect(isLocale('ru')).toBe(true);
    expect(isLocale('lv')).toBe(true);
    expect(isLocale('LV')).toBe(false);
    expect(isLocale('de')).toBe(false);
    expect(isLocale('')).toBe(false);
  });
});
