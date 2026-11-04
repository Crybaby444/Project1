'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiClient } from '@yoyo/api-client';
import { SESSION_HINT_COOKIE, type PublicUser } from '@yoyo/shared';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';
import { ApiError, unwrap } from './api-error';
import { onSessionLost as appOnSessionLost } from './fetch-with-refresh';

export type SessionStatus = 'loading' | 'authenticated' | 'anonymous';

export type Session = {
  status: SessionStatus;
  user: PublicUser | null;
  /** Asks GET /me again (after a profile change elsewhere, a confirmed email…). */
  refresh(): Promise<void>;
  /** Ends this browser's session (POST /auth/logout) and forgets the user. */
  signOut(): Promise<void>;
  /** Shows a user the API has just returned (sign-in, profile update) without asking again; null signs out locally. */
  setUser(user: PublicUser | null): void;
  /** Forgets the user after the API has already ended the session (sign out everywhere, account deleted). */
  forget(): void;
  /** When the person last ended the session themselves (the closed page they are on then goes home, not to /login). */
  endedAt: number | null;
};

export const SESSION_QUERY_KEY = ['session', 'me'] as const;

type SessionContextValue = Session & { client: ApiClient };

const SessionContext = createContext<SessionContextValue | null>(null);

export function hasSessionHint(
  cookies: string = typeof document === 'undefined' ? '' : document.cookie,
): boolean {
  return cookies.split(/;\s*/).some((pair) => pair.startsWith(`${SESSION_HINT_COOKIE}=`));
}

/**
 * The signed-in user, or null for a visitor. Without the hint cookie there is no session to ask
 * about, so a visitor's pages make no request (and log no 401). Other failures throw, so the query
 * keeps the user it had.
 */
async function fetchMe(client: ApiClient, hasSession: () => boolean): Promise<PublicUser | null> {
  if (!hasSession()) return null;
  try {
    return (await unwrap(client.GET('/api/v1/me'))).user;
  } catch (error) {
    // Only "not signed in" or "blocked" mean no user; an API hiccup keeps the user already shown.
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return null;
    throw error;
  }
}

/**
 * Holds the signed-in user for the whole site (TanStack Query, key SESSION_QUERY_KEY).
 * `client` is the API client to use; tests pass a fake one.
 */
export function SessionProvider({
  children,
  client = api,
  hasSession = hasSessionHint,
  onSessionLost = appOnSessionLost,
}: {
  children: ReactNode;
  client?: ApiClient;
  /** Whether a session may exist (tests replace the cookie check). */
  hasSession?: () => boolean;
  /** "The API refused to renew the session" (fetchWithRefresh); tests pass their own. */
  onSessionLost?: (listener: () => void) => () => void;
}) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: () => fetchMe(client, hasSession),
    staleTime: 60_000,
    retry: (failures, error) => !(error instanceof ApiError && error.code !== 'NETWORK') && failures < 2,
  });

  const [endedAt, setEndedAt] = useState<number | null>(null);

  const setUser = useCallback(
    (user: PublicUser | null) => {
      if (user) setEndedAt(null);
      queryClient.setQueryData(SESSION_QUERY_KEY, user);
    },
    [queryClient],
  );

  const forget = useCallback(() => {
    setEndedAt(Date.now());
    // Private caches go with the user.
    queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== SESSION_QUERY_KEY[0] });
    queryClient.setQueryData(SESSION_QUERY_KEY, null);
  }, [queryClient]);

  // Any request can find the session over (signed out everywhere, blocked, expired): the whole site
  // shows a visitor at once, and a closed page sends them to sign in and back (endedAt stays as is).
  useEffect(
    () =>
      onSessionLost(() => {
        queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== SESSION_QUERY_KEY[0] });
        queryClient.setQueryData(SESSION_QUERY_KEY, null);
      }),
    [onSessionLost, queryClient],
  );

  const refresh = useCallback(async () => {
    // A GET /me already on its way may have been answered before the change; ask again after it.
    await queryClient.cancelQueries({ queryKey: SESSION_QUERY_KEY, exact: true });
    await queryClient.refetchQueries({ queryKey: SESSION_QUERY_KEY, exact: true });
  }, [queryClient]);

  const signOut = useCallback(async () => {
    try {
      await client.POST('/api/v1/auth/logout');
    } catch {
      // Offline or API down: the cookies stay until they expire, but this browser forgets the user.
    }
    forget();
  }, [client, forget]);

  const user = query.data ?? null;
  // A first GET /me that failed (API down) leaves no user: treated as a visitor.
  const status: SessionStatus = query.isPending ? 'loading' : user ? 'authenticated' : 'anonymous';

  const value = useMemo(
    () => ({ status, user, refresh, signOut, setUser, forget, endedAt, client }),
    [status, user, refresh, signOut, setUser, forget, endedAt, client],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

function useSessionContext(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside <SessionProvider>');
  return value;
}

export function useSession(): Session {
  const { status, user, refresh, signOut, setUser, forget, endedAt } = useSessionContext();
  return { status, user, refresh, signOut, setUser, forget, endedAt };
}

/** The API client of the session (the app's, or a test's fake). */
export function useApiClient(): ApiClient {
  return useSessionContext().client;
}
