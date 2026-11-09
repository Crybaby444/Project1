'use client';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import type { BookingEventInput, BookingView, LedgerKind } from '@yoyo/shared';
import { useCallback } from 'react';
import { unwrap } from '@/lib/session/api-error';
import { useApiClient } from '@/lib/session/SessionProvider';
import { useIdempotentMutation } from './idempotency';
import type { DealRole } from './status';

/**
 * Query keys of deal and wallet data. Everything under `deals` and `wallet` is private: signing out
 * drops it (SessionProvider keeps only the session). Booking terms are public.
 */
export const dealKeys = {
  all: ['deals'] as const,
  one: (id: string) => ['deals', 'one', id] as const,
  history: (id: string) => ['deals', 'history', id] as const,
  photos: (id: string) => ['deals', 'photos', id] as const,
  mine: (role: DealRole, group: 'open' | 'closed', page: number) => ['deals', 'mine', role, group, page] as const,
  summary: ['deals', 'summary'] as const,
  terms: (listingId: string) => ['booking-terms', listingId] as const,
};

export const walletKeys = {
  all: ['wallet'] as const,
  summary: ['wallet', 'summary'] as const,
  history: (kind: LedgerKind | 'ALL', page: number) => ['wallet', 'history', kind, page] as const,
};

export function useDeal(id: string) {
  const client = useApiClient();
  return useQuery({
    queryKey: dealKeys.one(id),
    queryFn: async () =>
      (await unwrap(client.GET('/api/v1/bookings/{id}', { params: { path: { id } } }))).booking,
    // The other side may act at any time; a returning tab shows the deal as it is.
    refetchOnWindowFocus: true,
  });
}

export function useDealHistory(id: string) {
  const client = useApiClient();
  return useQuery({
    queryKey: dealKeys.history(id),
    queryFn: async () =>
      (await unwrap(client.GET('/api/v1/bookings/{id}/history', { params: { path: { id } } }))).items,
  });
}

export function useDealPhotos(id: string) {
  const client = useApiClient();
  return useQuery({
    queryKey: dealKeys.photos(id),
    queryFn: async () =>
      (await unwrap(client.GET('/api/v1/bookings/{id}/photos', { params: { path: { id } } }))).items,
  });
}

/** "My deals" of one side, open or closed, 20 a page, last changed first. */
export function useMyDeals(role: DealRole, group: 'open' | 'closed', page = 1) {
  const client = useApiClient();
  return useQuery({
    queryKey: dealKeys.mine(role, group, page),
    queryFn: async () => unwrap(client.GET('/api/v1/me/bookings', { params: { query: { role, group, page } } })),
    placeholderData: keepPreviousData,
  });
}

/** Counters for the tabs and the user menu. */
export function useDealsSummary(enabled = true) {
  const client = useApiClient();
  return useQuery({
    queryKey: dealKeys.summary,
    queryFn: async () => unwrap(client.GET('/api/v1/me/bookings/summary')),
    enabled,
    staleTime: 30_000,
  });
}

/** What anyone needs to price days of a published listing (public). */
export function useBookingTerms(listingId: string) {
  const client = useApiClient();
  return useQuery({
    queryKey: dealKeys.terms(listingId),
    queryFn: async () =>
      unwrap(client.GET('/api/v1/listings/{id}/booking-terms', { params: { path: { id: listingId } } })),
    retry: false,
  });
}

export function useWallet() {
  const client = useApiClient();
  return useQuery({ queryKey: walletKeys.summary, queryFn: async () => unwrap(client.GET('/api/v1/wallet')) });
}

export function useWalletHistory(kind: LedgerKind | 'ALL', page: number) {
  const client = useApiClient();
  return useQuery({
    queryKey: walletKeys.history(kind, page),
    queryFn: async () =>
      unwrap(
        client.GET('/api/v1/wallet/transactions', {
          params: { query: { page, ...(kind !== 'ALL' && { kind }) } },
        }),
      ),
    placeholderData: keepPreviousData,
  });
}

/** Everything a step of a deal can change: the deal, its journal, the lists, the counters and the wallet. */
export function useRefreshAfterDeal() {
  const queryClient = useQueryClient();
  return useCallback(
    async (booking?: BookingView) => {
      if (booking) queryClient.setQueryData(dealKeys.one(booking.id), booking);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: dealKeys.all,
          // The deal itself was just set from the answer; refetching it would only repeat it.
          predicate: (query) => !booking || query.queryKey.join('/') !== dealKeys.one(booking.id).join('/'),
        }),
        queryClient.invalidateQueries({ queryKey: walletKeys.all }),
      ]);
    },
    [queryClient],
  );
}

/**
 * One step of a deal (`POST /bookings/:id/events`) with the deal's version and an Idempotency-Key per
 * intent: a double click or a retry after a lost answer is the same request. The answer replaces the
 * deal in the cache; nothing changes on screen before it comes (money and steps are never optimistic).
 */
export function useDealAction(booking: Pick<BookingView, 'id' | 'version'>) {
  const client = useApiClient();
  const refresh = useRefreshAfterDeal();
  return useIdempotentMutation<BookingEventInput, BookingView>({
    intent: (event) => `${booking.id}:${booking.version}:${JSON.stringify(event)}`,
    mutate: async (event, key) => {
      const { booking: next } = await unwrap(
        client.POST('/api/v1/bookings/{id}/events', {
          params: { path: { id: booking.id }, header: { 'Idempotency-Key': key } },
          body: { version: booking.version, event },
        }),
      );
      await refresh(next);
      return next;
    },
  });
}
