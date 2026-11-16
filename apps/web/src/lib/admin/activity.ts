'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import type { ActivityGroup, ActivityPage } from '@yoyo/shared';
import { unwrap } from '@/lib/session/api-error';
import { useApiClient } from '@/lib/session/SessionProvider';

/** Admin → Activity: pages of 50, older on demand; the newest page refreshes every 30 seconds. */
export function useActivity(filter: { group?: ActivityGroup; userId?: string }) {
  const client = useApiClient();
  return useInfiniteQuery({
    queryKey: ['admin', 'activity', filter],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }): Promise<ActivityPage> =>
      unwrap(client.GET('/api/v1/admin/activity', { params: { query: { ...filter, ...(pageParam && { before: pageParam }), limit: 50 } } })),
    getNextPageParam: (page: ActivityPage) => page.next ?? undefined,
    refetchInterval: 30_000,
  });
}
