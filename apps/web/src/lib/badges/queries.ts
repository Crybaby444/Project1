'use client';

import { useQuery } from '@tanstack/react-query';
import type { Badges } from '@yoyo/shared';
import { unwrap } from '@/lib/session/api-error';
import { useApiClient, useSession } from '@/lib/session/SessionProvider';

/** The header's counts. Private: signing out drops every key but the session (SessionProvider). */
export const badgeKeys = { all: ['badges'] as const };

/**
 * How often the header asks for its counts while the tab is visible (and at once when the tab comes back,
 * and after one's own step). One request for the bell, messages and deals together (owner, 2026-11-28:
 * the site must carry 1000+ active people; three requests every 10–15 s each became one every 20 s).
 */
export const BADGES_POLL_MS = 20_000;

/** One shared request; each caller picks the count it shows. */
export function useBadges<T = Badges>(select?: (badges: Badges) => T, enabled = true) {
  const client = useApiClient();
  const { status } = useSession();
  return useQuery({
    queryKey: badgeKeys.all,
    queryFn: async () => unwrap(client.GET('/api/v1/me/badges')),
    enabled: enabled && status === 'authenticated',
    refetchInterval: BADGES_POLL_MS,
    staleTime: 10_000,
    select,
  });
}
