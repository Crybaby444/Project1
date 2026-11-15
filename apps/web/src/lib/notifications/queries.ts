'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { EmailPreferences, Notification } from '@yoyo/shared';
import { unwrap } from '@/lib/session/api-error';
import { useApiClient, useSession } from '@/lib/session/SessionProvider';

/** Private: signing out drops these keys with the rest (SessionProvider). */
export const notificationKeys = {
  all: ['notifications'] as const,
  list: ['notifications', 'list'] as const,
  prefs: ['notifications', 'email'] as const,
};

/** How often the bell asks for news while the tab is visible. */
export const BELL_POLL_MS = 30_000;

export function useNotifications() {
  const client = useApiClient();
  const { status } = useSession();
  return useQuery({
    queryKey: notificationKeys.list,
    queryFn: async () => unwrap(client.GET('/api/v1/me/notifications')),
    enabled: status === 'authenticated',
    refetchInterval: BELL_POLL_MS,
    staleTime: 10_000,
  });
}

export function useMarkNotificationRead() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | 'all') => {
      await unwrap(
        id === 'all'
          ? client.POST('/api/v1/me/notifications/read')
          : client.POST('/api/v1/me/notifications/{id}/read', { params: { path: { id } } }),
      );
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: notificationKeys.list }),
  });
}

export function useEmailPreferences() {
  const client = useApiClient();
  const { status } = useSession();
  return useQuery({
    queryKey: notificationKeys.prefs,
    queryFn: async () => unwrap(client.GET('/api/v1/me/email-preferences')),
    enabled: status === 'authenticated',
  });
}

export function useSaveEmailPreferences() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (prefs: EmailPreferences) => unwrap(client.PUT('/api/v1/me/email-preferences', { body: prefs })),
    onSuccess: (data) => queryClient.setQueryData(notificationKeys.prefs, data),
  });
}

/** Where a notification leads. */
export function notificationHref(n: Notification): string {
  if (n.kind === 'LISTING' && n.listingId) return n.event === 'APPROVED' ? `/listings/${n.listingId}` : `/listings/${n.listingId}/edit`;
  if ((n.kind === 'OFFER' || n.kind === 'SEARCH') && n.listingId) return `/listings/${n.listingId}`;
  if (n.bookingId) return `/bookings/${n.bookingId}`;
  return '/notifications';
}
