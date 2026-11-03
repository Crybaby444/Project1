'use client';

import {
  parseThemePreference,
  type ResolvedTheme,
  resolveTheme,
  THEME_COOKIE,
  type ThemePreference,
} from '@yoyo/shared';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { prefersReducedMotion } from '@/lib/motion';
import { type Point, shouldAnimateThemeChange, switchTheme } from './switch-theme';

type ThemeContextValue = {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (preference: ThemePreference, origin?: Point) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const DARK_QUERY = '(prefers-color-scheme: dark)';
const ONE_YEAR = 60 * 60 * 24 * 365;

function systemPrefersDark(): boolean {
  return window.matchMedia(DARK_QUERY).matches;
}

function applyToDocument(preference: ThemePreference, resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.dataset.themePreference = preference;
}

export function ThemeProvider({
  initialPreference,
  children,
}: {
  initialPreference: ThemePreference;
  children: ReactNode;
}) {
  const [preference, setPreferenceState] = useState<ThemePreference>(initialPreference);
  // Must match the server render; the effect below reads what the inline script put on <html>.
  const [resolved, setResolved] = useState<ResolvedTheme>(initialPreference === 'dark' ? 'dark' : 'light');

  useEffect(() => {
    const current = parseThemePreference(document.documentElement.dataset.themePreference);
    setPreferenceState(current);
    setResolved(resolveTheme(current, systemPrefersDark()));
  }, []);

  // Follow live OS changes while the preference is "system".
  useEffect(() => {
    if (preference !== 'system') return;
    const media = window.matchMedia(DARK_QUERY);
    const onChange = () => {
      const next = resolveTheme('system', media.matches);
      applyToDocument('system', next);
      setResolved(next);
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference, origin?: Point) => {
    const nextResolved = resolveTheme(next, systemPrefersDark());
    document.cookie = `${THEME_COOKIE}=${next}; Max-Age=${ONE_YEAR}; Path=/; SameSite=Lax`;
    const animate = shouldAnimateThemeChange(prefersReducedMotion(), 'startViewTransition' in document);
    switchTheme(
      () => applyToDocument(next, nextResolved),
      origin ?? { x: window.innerWidth / 2, y: 0 },
      animate,
    );
    setPreferenceState(next);
    setResolved(nextResolved);
  }, []);

  const value = useMemo(() => ({ preference, resolved, setPreference }), [preference, resolved, setPreference]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside <ThemeProvider>');
  return value;
}
