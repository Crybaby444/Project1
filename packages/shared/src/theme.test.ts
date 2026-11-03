import { describe, expect, it } from 'vitest';
import { parseThemePreference, resolveTheme, THEME_COOKIE, THEME_PREFERENCES } from './theme.js';

describe('theme', () => {
  it('exposes preferences and cookie name', () => {
    expect(THEME_PREFERENCES).toEqual(['system', 'light', 'dark']);
    expect(THEME_COOKIE).toBe('yoyo-theme');
  });

  it('resolves the system preference from the OS setting', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });

  it('keeps an explicit choice regardless of the OS', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('falls back to system for unknown or missing values', () => {
    expect(parseThemePreference('purple')).toBe('system');
    expect(parseThemePreference(undefined)).toBe('system');
    expect(parseThemePreference('dark')).toBe('dark');
  });
});
