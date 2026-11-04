'use client';

import {
  THEME_COOKIE,
  resolveTheme,
  type ResolvedTheme,
  type ThemePreference,
} from '@yoyo/shared';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { shouldAnimateThemeChange, switchTheme, type Point } from './switch-theme';

const ONE_YEAR_S = 365 * 24 * 60 * 60;
const DARK_QUERY = '(prefers-color-scheme: dark)';

type ThemeContextValue = {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (preference: ThemePreference, origin?: Point) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** <html data-theme> is the single source of truth for the theme on screen. */
function readDomTheme(): ResolvedTheme {
  return document.documentElement.dataset['theme'] === 'dark' ? 'dark' : 'light';
}

function subscribeToDomTheme(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
}

function setDomTheme(theme: ResolvedTheme): void {
  document.documentElement.dataset['theme'] = theme;
}

function viewportCenter(): Point {
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

export function ThemeProvider({
  initialPreference,
  children,
}: {
  initialPreference: ThemePreference;
  children: ReactNode;
}) {
  const [preference, setPreferenceState] = useState<ThemePreference>(initialPreference);
  // The server cannot see the OS theme; the head script already put the real one on <html>.
  const resolved = useSyncExternalStore(subscribeToDomTheme, readDomTheme, () =>
    initialPreference === 'dark' ? 'dark' : 'light',
  );

  // While following the system, follow the OS switching between light and dark.
  useEffect(() => {
    if (preference !== 'system') return;
    const media = window.matchMedia(DARK_QUERY);
    const onChange = () => setDomTheme(media.matches ? 'dark' : 'light');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference, origin?: Point) => {
    // "System" is no choice at all: drop the cookie, so the server and the head script follow the OS.
    document.cookie =
      next === 'system'
        ? `${THEME_COOKIE}=; path=/; max-age=0; samesite=lax`
        : `${THEME_COOKIE}=${next}; path=/; max-age=${ONE_YEAR_S}; samesite=lax`;
    const nextTheme = resolveTheme(next, window.matchMedia(DARK_QUERY).matches);
    const animate = shouldAnimateThemeChange(
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      typeof document.startViewTransition === 'function',
    );
    switchTheme(() => setDomTheme(nextTheme), origin ?? viewportCenter(), animate);
    setPreferenceState(next);
  }, []);

  const value = useMemo(() => ({ preference, resolved, setPreference }), [preference, resolved, setPreference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside <ThemeProvider>');
  return value;
}
