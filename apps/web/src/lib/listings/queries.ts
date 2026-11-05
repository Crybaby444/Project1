'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { ListingStatus } from '@yoyo/shared';
import { unwrap } from '@/lib/session/api-error';
import { useApiClient } from '@/lib/session/SessionProvider';

/** Query keys of listing data. All of it is private: signing out drops it (see SessionProvider). */
export const listingKeys = {
  categories: ['categories'] as const,
  all: ['listings'] as const,
  one: (id: string) => ['listings', 'one', id] as const,
  mine: (status: ListingStatus | 'ALL') => ['listings', 'mine', status] as const,
  queue: (page: number) => ['listings', 'queue', page] as const,
};

/** The category tree with attributes (public, changes rarely). */
export function useCategories() {
  const client = useApiClient();
  return useQuery({
    queryKey: listingKeys.categories,
    queryFn: async () => (await unwrap(client.GET('/api/v1/categories'))).categories,
    staleTime: 5 * 60_000,
  });
}

/** One listing of the signed-in owner (or any, for an administrator). */
export function useListing(id: string | null) {
  const client = useApiClient();
  return useQuery({
    queryKey: listingKeys.one(id ?? ''),
    queryFn: async () =>
      (await unwrap(client.GET('/api/v1/listings/{id}', { params: { path: { id: id! } } }))).listing,
    enabled: id !== null,
    // The builder owns the listing while it is open; a refetch would race its autosave. Once it is
    // closed the copy is dropped, so the next visit starts from the stored listing and its version.
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
}

/** "My items": every listing except archived ones, or only those in `status`. */
export function useMyListings(status: ListingStatus | 'ALL') {
  const client = useApiClient();
  return useQuery({
    queryKey: listingKeys.mine(status),
    queryFn: async () =>
      (
        await unwrap(
          client.GET('/api/v1/me/listings', { params: { query: status === 'ALL' ? {} : { status } } }),
        )
      ).items,
    placeholderData: keepPreviousData,
  });
}

/** The moderation queue (administrators only), oldest first. */
export function useModerationQueue(page: number) {
  const client = useApiClient();
  return useQuery({
    queryKey: listingKeys.queue(page),
    queryFn: async () =>
      unwrap(client.GET('/api/v1/admin/listings', { params: { query: { status: 'PENDING_REVIEW', page } } })),
    placeholderData: keepPreviousData,
  });
}
