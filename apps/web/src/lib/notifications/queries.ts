'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { EmailPreferences, Notification } from '@yoyo/shared';
import { badgeKeys } from '@/lib/badges/queries';
import { unwrap } from '@/lib/session/api-error';
import { useApiClient, useSession } from '@/lib/session/SessionProvider';

/** Private: signing out drops these keys with the rest (SessionProvider). */
export const notificationKeys = {
  all: ['notifications'] as const,
  list: ['notifications', 'list'] as const,
  prefs: ['notifications', 'email'] as const,
};

/** How often an open list of notifications (the bell's panel, the page) asks for news while the tab is visible. */
export const BELL_POLL_MS = 20_000;

/**
 * The newest notifications. Asked only where they are shown (the open panel, the page): the bell's count
 * comes with the header's other counts (lib/badges).
 */
export function useNotifications(enabled = true) {
  const client = useApiClient();
  const { status } = useSession();
  return useQuery({
    queryKey: notificationKeys.list,
    queryFn: async () => unwrap(client.GET('/api/v1/me/notifications')),
    enabled: enabled && status === 'authenticated',
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
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.list });
      void queryClient.invalidateQueries({ queryKey: badgeKeys.all });
    },
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
  // A new offer is answered in "My deals"; an answer to the renter's offer leads back to the item, to book.
  if (n.kind === 'OFFER' && n.event === 'OFFER_MADE') return '/bookings?role=owner';
  if ((n.kind === 'OFFER' || n.kind === 'SEARCH' || n.kind === 'FOLLOW') && n.listingId) return `/listings/${n.listingId}`;
  if (n.kind === 'IDENTITY') return n.event === 'VERIFIED' ? '/' : '/settings#identity';
  // A new line in a deal's chat opens the deal right at its chat.
  if (n.bookingId) return n.event === 'MESSAGE' ? `/bookings/${n.bookingId}#deal-chat` : `/bookings/${n.bookingId}`;
  return '/notifications';
}
