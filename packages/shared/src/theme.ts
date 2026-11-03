export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const;

export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export type ResolvedTheme = 'light' | 'dark';

/** Cookie that stores the user's theme preference, readable during server rendering. */
export const THEME_COOKIE = 'yoyo-theme';

/** Turns a raw cookie value into a preference; anything unknown means "follow the system". */
export function parseThemePreference(value: string | undefined): ThemePreference {
  return (THEME_PREFERENCES as readonly string[]).includes(value ?? '') ? (value as ThemePreference) : 'system';
}

export function resolveTheme(preference: ThemePreference, systemPrefersDark: boolean): ResolvedTheme {
  if (preference === 'system') return systemPrefersDark ? 'dark' : 'light';
  return preference;
}
