'use client';

import { resolveTheme, THEME_COOKIE, type ResolvedTheme, type ThemePreference } from '@yoyo/shared';
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { prefersReducedMotion } from '@/lib/motion';
import { shouldAnimateThemeChange, switchTheme, type Point } from './switch-theme';

const ONE_YEAR = 60 * 60 * 24 * 365;
const DARK_QUERY = '(prefers-color-scheme: dark)';

interface ThemeContextValue {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference(preference: ThemePreference, origin?: Point): void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(DARK_QUERY).matches;
}

function applyToDocument(theme: ResolvedTheme) {
  document.documentElement.dataset.theme = theme;
}

export function ThemeProvider({
  initialPreference,
  children,
}: {
  initialPreference: ThemePreference;
  children: ReactNode;
}) {
  const [preference, setPreferenceState] = useState<ThemePreference>(initialPreference);
  // On the server "system" is unknown; the inline script has already fixed the DOM.
  const [resolved, setResolved] = useState<ResolvedTheme>(() =>
    initialPreference === 'system' ? 'light' : initialPreference,
  );

  useEffect(() => {
    setResolved(resolveTheme(preference, systemPrefersDark()));
    if (preference !== 'system') return;
    const media = window.matchMedia(DARK_QUERY);
    const onChange = () => {
      const next = resolveTheme('system', media.matches);
      applyToDocument(next);
      setResolved(next);
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference, origin?: Point) => {
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
    const nextResolved = resolveTheme(next, systemPrefersDark());
    const apply = () => {
      applyToDocument(nextResolved);
      setResolved(nextResolved);
      setPreferenceState(next);
    };
    const point = origin ?? { x: window.innerWidth / 2, y: 0 };
    const animate = shouldAnimateThemeChange(
      prefersReducedMotion(),
      typeof document.startViewTransition === 'function',
    );
    switchTheme(apply, point, animate);
  }, []);

  const value = useMemo(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference],
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useTheme(): ThemeContextValue {
  const ctx = use(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
