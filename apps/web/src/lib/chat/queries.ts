'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrap } from '@/lib/session/api-error';
import { useApiClient, useSession } from '@/lib/session/SessionProvider';

/** Conversations are private: signing out drops these keys with the rest (SessionProvider). */
export const chatKeys = {
  all: ['chat'] as const,
  list: ['chat', 'list'] as const,
  unread: ['chat', 'unread'] as const,
  thread: (id: string) => ['chat', 'thread', id] as const,
};

/** How often an open conversation asks for new lines, and the menu for the unread count. */
export const THREAD_POLL_MS = 3_000;
export const UNREAD_POLL_MS = 10_000;

export function useConversations() {
  const client = useApiClient();
  const { status } = useSession();
  return useQuery({
    queryKey: chatKeys.list,
    queryFn: async () => (await unwrap(client.GET('/api/v1/me/conversations'))).items,
    enabled: status === 'authenticated',
    refetchInterval: UNREAD_POLL_MS,
  });
}

/** The unread count for the menu badge; asked again every 30 s while the tab is visible. */
export function useUnreadCount() {
  const client = useApiClient();
  const { status } = useSession();
  return useQuery({
    queryKey: chatKeys.unread,
    queryFn: async () => (await unwrap(client.GET('/api/v1/me/conversations/unread'))).count,
    enabled: status === 'authenticated',
    refetchInterval: UNREAD_POLL_MS,
    staleTime: 10_000,
  });
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
      void queryClient.invalidateQueries({ queryKey: chatKeys.unread });
      void queryClient.invalidateQueries({ queryKey: chatKeys.list });
    },
  });
}

/** Starts (or finds) my conversation about an item; answers its id. */
export function useOpenConversation() {
  const client = useApiClient();
  return useMutation({
    mutationFn: async (listingId: string) =>
      (await unwrap(client.POST('/api/v1/listings/{id}/conversation', { params: { path: { id: listingId } } }))).conversation,
  });
}
