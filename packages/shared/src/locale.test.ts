import { describe, expect, it } from 'vitest';
import { DEFAULT_LOCALE, isLocale, LOCALES } from './locale.js';

describe('locale', () => {
  it('lists the supported locales with English first', () => {
    expect(LOCALES).toEqual(['en', 'lv', 'ru']);
    expect(DEFAULT_LOCALE).toBe('en');
  });

  it('accepts only exact, lower-case locale codes', () => {
    expect(isLocale('ru')).toBe(true);
    expect(isLocale('LV')).toBe(false);
    expect(isLocale('de')).toBe(false);
  });
});
