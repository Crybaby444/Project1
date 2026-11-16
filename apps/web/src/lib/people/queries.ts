'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrap } from '@/lib/session/api-error';
import { useApiClient, useSession } from '@/lib/session/SessionProvider';

/** Who you follow is private: signing out drops these keys with the rest. */
export const followKeys = {
  ids: ['following', 'ids'] as const,
  list: ['following', 'list'] as const,
  feed: (page: number) => ['following', 'feed', page] as const,
};

export function useFollowingIds() {
  const client = useApiClient();
  const { status } = useSession();
  return useQuery({
    queryKey: followKeys.ids,
    queryFn: async () => new Set((await unwrap(client.GET('/api/v1/me/following/ids'))).ids),
    enabled: status === 'authenticated',
    staleTime: 60_000,
  });
}

/** Follow or unfollow at once on screen, then tell the API; a failure puts it back. */
export function useToggleFollow(userId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    scope: { id: `follow-${userId}` },
    mutationFn: async (follow: boolean) => {
      const path = { params: { path: { id: userId } } };
      await unwrap(follow ? client.POST('/api/v1/users/{id}/follow', path) : client.DELETE('/api/v1/users/{id}/follow', path));
    },
    onMutate: async (follow) => {
      await queryClient.cancelQueries({ queryKey: followKeys.ids });
      const before = queryClient.getQueryData<Set<string>>(followKeys.ids);
      const next = new Set(before ?? []);
      if (follow) next.add(userId);
      else next.delete(userId);
      queryClient.setQueryData(followKeys.ids, next);
      return { before };
    },
    onError: (_e, _v, ctx) => queryClient.setQueryData(followKeys.ids, ctx?.before),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ['following'] }),
  });
}

export function useFollowing() {
  const client = useApiClient();
  const { status } = useSession();
  return useQuery({ queryKey: followKeys.list, queryFn: async () => (await unwrap(client.GET('/api/v1/me/following'))).items, enabled: status === 'authenticated' });
}

export function useFollowFeed(page: number) {
  const client = useApiClient();
  const { status } = useSession();
  return useQuery({
    queryKey: followKeys.feed(page),
    queryFn: async () => unwrap(client.GET('/api/v1/me/following/feed', { params: { query: { page } } })),
    enabled: status === 'authenticated',
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });
}

/** People by name (public); asks once there are two letters. */
export function usePeopleSearch(q: string) {
  const client = useApiClient();
  const words = q.trim();
  return useQuery({
    queryKey: ['people', words] as const,
    queryFn: async () => (await unwrap(client.GET('/api/v1/people', { params: { query: { q: words } } }))).items,
    enabled: words.length >= 2,
    staleTime: 30_000,
  });
}

/** Who follows a person, or whom they follow (public lists, asked for only when opened). */
export function usePeopleOf(userId: string, list: 'followers' | 'following' | null) {
  const client = useApiClient();
  return useQuery({
    queryKey: ['people-of', userId, list],
    enabled: list !== null,
    queryFn: async () =>
      list === 'followers'
        ? (await unwrap(client.GET('/api/v1/users/{id}/followers', { params: { path: { id: userId } } }))).items
        : (await unwrap(client.GET('/api/v1/users/{id}/following', { params: { path: { id: userId } } }))).items,
  });
}
