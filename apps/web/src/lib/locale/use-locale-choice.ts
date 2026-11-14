'use client';

import type { Locale } from '@yoyo/shared';
import { useCallback } from 'react';
import { unwrap } from '@/lib/session/api-error';
import { useApiClient, useSession } from '@/lib/session/SessionProvider';
import { writeLocaleChoice } from './choice';

/**
 * Remembers a language the visitor picked: in the NEXT_LOCALE cookie at once, and for a signed-in
 * person also in their profile (PATCH /me), like the theme. A failed save keeps the cookie.
 */
export function useRememberLocale(): (locale: Locale) => void {
  const { status, user, setUser } = useSession();
  const client = useApiClient();
  return useCallback(
    (locale: Locale) => {
      writeLocaleChoice(locale);
      if (status !== 'authenticated' || user?.locale === locale) return;
      unwrap(client.PATCH('/api/v1/me', { body: { locale } }))
        .then(({ user: saved }) => setUser(saved))
        .catch(() => {});
    },
    [client, setUser, status, user?.locale],
  );
}
