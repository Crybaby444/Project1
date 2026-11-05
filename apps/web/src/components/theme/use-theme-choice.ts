'use client';

import type { ResolvedTheme, ThemePreference } from '@yoyo/shared';
import { useCallback, useEffect, useRef } from 'react';
import { unwrap } from '@/lib/session/api-error';
import { useApiClient, useSession } from '@/lib/session/SessionProvider';
import type { Point } from './switch-theme';
import { useTheme } from './ThemeProvider';

/** Quick changes (toggle, toggle, toggle) reach the profile as one save of the last choice. */
const SAVE_DELAY_MS = 400;

/**
 * Changing the theme as a person's choice: on screen and in the cookie at once, and for a signed-in
 * person also in their profile (PATCH /me), so it follows them to other devices (SyncThemeWithProfile).
 * A failed save leaves the screen as chosen; the cookie still remembers it here.
 */
export function useThemeChoice(): {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  choose(next: ThemePreference, origin?: Point): void;
} {
  const { preference, resolved, setPreference } = useTheme();
  const { status, setUser } = useSession();
  const client = useApiClient();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const choose = useCallback(
    (next: ThemePreference, origin?: Point) => {
      setPreference(next, origin);
      if (status !== 'authenticated') return;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        unwrap(client.PATCH('/api/v1/me', { body: { theme: next } }))
          .then(({ user }) => setUser(user))
          .catch(() => {});
      }, SAVE_DELAY_MS);
    },
    [client, setPreference, setUser, status],
  );

  return { preference, resolved, choose };
}

/**
 * When a person signs in on this device (or a page loads signed in), the theme saved in their
 * profile wins over this browser's cookie, once per signed-in user.
 */
export function SyncThemeWithProfile(): null {
  const { user } = useSession();
  const { preference, setPreference } = useTheme();
  const appliedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      appliedFor.current = null;
      return;
    }
    if (appliedFor.current === user.id) return;
    appliedFor.current = user.id;
    if (user.theme !== preference) setPreference(user.theme);
  }, [user, preference, setPreference]);

  return null;
}
