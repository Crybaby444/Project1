'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { badgeKeys, useBadges } from '@/lib/badges/queries';
import { unwrap } from '@/lib/session/api-error';
import { useApiClient, useSession } from '@/lib/session/SessionProvider';

/** Conversations are private: signing out drops these keys with the rest (SessionProvider). */
export const chatKeys = {
  all: ['chat'] as const,
  list: ['chat', 'list'] as const,
  unread: ['chat', 'unread'] as const,
  thread: (id: string) => ['chat', 'thread', id] as const,
};

/** How often an open conversation asks for new lines, and the conversation list for its order. */
export const THREAD_POLL_MS = 4_000;
export const UNREAD_POLL_MS = 10_000;

/** Messages = personal conversations only (owner, 2026-11-16); a deal's conversation lives in the deal. */
export function useConversations() {
  const client = useApiClient();
  const { status } = useSession();
  return useQuery({
    queryKey: chatKeys.list,
    queryFn: async () => (await unwrap(client.GET('/api/v1/me/conversations', { params: { query: { kind: 'direct' } } }))).items,
    enabled: status === 'authenticated',
    refetchInterval: UNREAD_POLL_MS,
  });
}

/** The unread count for the menu badge, from the header's one request for its counts. */
export function useUnreadCount() {
  return useBadges((badges) => badges.messages);
}

export function useThread(id: string) {
  const client = useApiClient();
  const { status } = useSession();
  return useQuery({
    queryKey: chatKeys.thread(id),
    queryFn: async () => unwrap(client.GET('/api/v1/conversations/{id}', { params: { path: { id } } })),
    enabled: status === 'authenticated',
    refetchInterval: THREAD_POLL_MS,
  });
}

export function useSendMessage(id: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (text: string) =>
      (await unwrap(client.POST('/api/v1/conversations/{id}/messages', { params: { path: { id } }, body: { text } }))).message,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: chatKeys.all }),
  });
}

export function useMarkRead(id: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await unwrap(client.POST('/api/v1/conversations/{id}/read', { params: { path: { id } } }));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: badgeKeys.all });
      void queryClient.invalidateQueries({ queryKey: chatKeys.list });
    },
  });
}

/** Starts (or finds) my personal conversation with someone; answers it. */
export function useOpenDirect() {
  const client = useApiClient();
  return useMutation({
    mutationFn: async (userId: string) =>
      (await unwrap(client.POST('/api/v1/users/{id}/conversation', { params: { path: { id: userId } } }))).conversation,
  });
}

/** The conversation of a deal (its two sides), shown inside the deal. */
export function useDealConversation(bookingId: string, enabled = true) {
  const client = useApiClient();
  const { status } = useSession();
  return useQuery({
    queryKey: ['chat', 'deal', bookingId] as const,
    queryFn: async () => (await unwrap(client.GET('/api/v1/bookings/{id}/conversation', { params: { path: { id: bookingId } } }))).conversation,
    enabled: enabled && status === 'authenticated',
    staleTime: Infinity,
  });
}
