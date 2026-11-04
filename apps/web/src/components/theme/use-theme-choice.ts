'use client';

import type { ResolvedTheme, ThemePreference } from '@yoyo/shared';
import { useCallback } from 'react';
import { unwrap } from '@/lib/session/api-error';
import { useApiClient, useSession } from '@/lib/session/SessionProvider';
import type { Point } from './switch-theme';
import { useTheme } from './ThemeProvider';

/**
 * Changing the theme as a person's choice: on screen and in the cookie at once, and for a signed-in
 * person also in their profile (PATCH /me), so it follows them to other devices. A failed save
 * leaves the screen as chosen; the cookie still remembers it here.
 */
export function useThemeChoice(): {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  choose(next: ThemePreference, origin?: Point): void;
} {
  const { preference, resolved, setPreference } = useTheme();
  const { status, setUser } = useSession();
  const client = useApiClient();

  const choose = useCallback(
    (next: ThemePreference, origin?: Point) => {
      setPreference(next, origin);
      if (status !== 'authenticated') return;
      unwrap(client.PATCH('/api/v1/me', { body: { theme: next } }))
        .then(({ user }) => setUser(user))
        .catch(() => {});
    },
    [client, setPreference, setUser, status],
  );

  return { preference, resolved, choose };
}
