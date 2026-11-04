'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiClient } from '@yoyo/api-client';
import type { PublicUser } from '@yoyo/shared';
import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { api } from '@/lib/api';
import { ApiError, unwrap } from './api-error';

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
};

export const SESSION_QUERY_KEY = ['session', 'me'] as const;

type SessionContextValue = Session & { client: ApiClient };

const SessionContext = createContext<SessionContextValue | null>(null);

/** The signed-in user, or null for a visitor (401). Other failures (API down) count as signed out too. */
async function fetchMe(client: ApiClient): Promise<PublicUser | null> {
  try {
    return (await unwrap(client.GET('/api/v1/me'))).user;
  } catch (error) {
    if (error instanceof ApiError) return null;
    throw error;
  }
}

/**
 * Holds the signed-in user for the whole site (TanStack Query, key SESSION_QUERY_KEY).
 * `client` is the API client to use; tests pass a fake one.
 */
export function SessionProvider({ children, client = api }: { children: ReactNode; client?: ApiClient }) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: () => fetchMe(client),
    staleTime: 60_000,
    retry: false,
  });

  const setUser = useCallback(
    (user: PublicUser | null) => queryClient.setQueryData(SESSION_QUERY_KEY, user),
    [queryClient],
  );

  const refresh = useCallback(async () => {
    await queryClient.refetchQueries({ queryKey: SESSION_QUERY_KEY, exact: true });
  }, [queryClient]);

  const signOut = useCallback(async () => {
    try {
      await client.POST('/api/v1/auth/logout');
    } finally {
      // Whatever the API said, this browser forgets the user; private caches go with them.
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== SESSION_QUERY_KEY[0] });
      queryClient.setQueryData(SESSION_QUERY_KEY, null);
    }
  }, [client, queryClient]);

  const user = query.data ?? null;
  const status: SessionStatus = query.isPending ? 'loading' : user ? 'authenticated' : 'anonymous';

  const value = useMemo(
    () => ({ status, user, refresh, signOut, setUser, client }),
    [status, user, refresh, signOut, setUser, client],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

function useSessionContext(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside <SessionProvider>');
  return value;
}

export function useSession(): Session {
  const { status, user, refresh, signOut, setUser } = useSessionContext();
  return { status, user, refresh, signOut, setUser };
}

/** The API client of the session (the app's, or a test's fake). */
export function useApiClient(): ApiClient {
  return useSessionContext().client;
}
