export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const;

export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export type ResolvedTheme = 'light' | 'dark';

export const THEME_COOKIE = 'yoyo-theme';

export function parseThemePreference(value: string | undefined): ThemePreference {
  return (THEME_PREFERENCES as readonly string[]).includes(value ?? '')
    ? (value as ThemePreference)
    : 'system';
}

export function resolveTheme(preference: ThemePreference, systemPrefersDark: boolean): ResolvedTheme {
  if (preference === 'system') return systemPrefersDark ? 'dark' : 'light';
  return preference;
}
