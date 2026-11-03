import { describe, expect, it } from 'vitest';
import { THEME_COOKIE, parseThemePreference, resolveTheme } from './theme';

describe('resolveTheme', () => {
  it('follows the OS when the preference is system', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });

  it('lets an explicit preference win over the OS', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });
});

describe('parseThemePreference', () => {
  it('keeps valid cookie values', () => {
    expect(parseThemePreference('dark')).toBe('dark');
    expect(parseThemePreference('light')).toBe('light');
  });

  it('falls back to system for missing or garbage values', () => {
    expect(parseThemePreference('purple')).toBe('system');
    expect(parseThemePreference(undefined)).toBe('system');
    expect(parseThemePreference('DARK')).toBe('system');
  });

  it('uses a stable cookie name', () => {
    expect(THEME_COOKIE).toBe('yoyo-theme');
  });
});
