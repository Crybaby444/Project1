'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { BookingStatus, LedgerKind, RESOLVE_DECISIONS } from '@yoyo/shared';

export type ResolveDecision = (typeof RESOLVE_DECISIONS)[number];
import { newIdempotencyKey } from '@/lib/deals/idempotency';
import { unwrap } from '@/lib/session/api-error';
import { useApiClient } from '@/lib/session/SessionProvider';

/** Admin data is private: signing out drops these keys with the rest (SessionProvider). */
export const adminKeys = {
  all: ['admin'] as const,
  overview: ['admin', 'overview'] as const,
  deals: (filter: DealFilter) => ['admin', 'deals', filter] as const,
  deal: (id: string) => ['admin', 'deal', id] as const,
  users: (search: string, page: number) => ['admin', 'users', search, page] as const,
  ledger: (kind: LedgerKind | undefined, page: number) => ['admin', 'ledger', kind ?? 'all', page] as const,
  summary: ['admin', 'ledger-summary'] as const,
  reports: (status: string, page: number) => ['admin', 'reports', status, page] as const,
};

export type DealFilter = { disputed: boolean; status?: BookingStatus; page: number };

/** The overview, also the source of the sidebar's counts; asked again every minute. */
export function useAdminOverview() {
  const client = useApiClient();
  return useQuery({
    queryKey: adminKeys.overview,
    queryFn: async () => unwrap(client.GET('/api/v1/admin/overview')),
    refetchInterval: 60_000,
    staleTime: 15_000,
  });
}

export function useAdminDeals(filter: DealFilter) {
  const client = useApiClient();
  return useQuery({
    queryKey: adminKeys.deals(filter),
    queryFn: async () =>
      unwrap(
        client.GET('/api/v1/admin/bookings', {
          params: { query: { page: filter.page, ...(filter.disputed ? { disputed: 'true' as const } : {}), ...(filter.status ? { status: filter.status } : {}) } },
        }),
      ),
    placeholderData: keepPreviousData,
  });
}

export function useAdminDeal(id: string) {
  const client = useApiClient();
  return useQuery({
    queryKey: adminKeys.deal(id),
    queryFn: async () => unwrap(client.GET('/api/v1/admin/bookings/{id}', { params: { path: { id } } })),
  });
}

export function useResolveDispute(id: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { version: number; decision: ResolveDecision; comment: string }) =>
      unwrap(
        client.POST('/api/v1/admin/bookings/{id}/resolve', {
          params: { path: { id }, header: { 'Idempotency-Key': newIdempotencyKey() } },
          body: input,
        }),
      ),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: adminKeys.all }),
  });
}

export function useAdminUsers(search: string, page: number) {
  const client = useApiClient();
  return useQuery({
    queryKey: adminKeys.users(search, page),
    queryFn: async () => unwrap(client.GET('/api/v1/admin/users', { params: { query: { page, ...(search ? { search } : {}) } } })),
    placeholderData: keepPreviousData,
  });
}

export function useBlockUser() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, block }: { id: string; block: boolean }) =>
      (
        await unwrap(
          block
            ? client.POST('/api/v1/admin/users/{id}/block', { params: { path: { id } } })
            : client.POST('/api/v1/admin/users/{id}/unblock', { params: { path: { id } } }),
        )
      ).user,
    onSettled: () => void queryClient.invalidateQueries({ queryKey: adminKeys.all }),
  });
}

export function useLedgerSummary() {
  const client = useApiClient();
  return useQuery({ queryKey: adminKeys.summary, queryFn: async () => unwrap(client.GET('/api/v1/admin/ledger/summary')) });
}

export function useLedgerOperations(kind: LedgerKind | undefined, page: number) {
  const client = useApiClient();
  return useQuery({
    queryKey: adminKeys.ledger(kind, page),
    queryFn: async () => unwrap(client.GET('/api/v1/admin/ledger/operations', { params: { query: { page, ...(kind ? { kind } : {}) } } })),
    placeholderData: keepPreviousData,
  });
}

export function useAdminReports(status: 'OPEN' | 'RESOLVED' | 'DISMISSED', page: number) {
  const client = useApiClient();
  return useQuery({
    queryKey: adminKeys.reports(status, page),
    queryFn: async () => unwrap(client.GET('/api/v1/admin/reports', { params: { query: { status, page } } })),
    placeholderData: keepPreviousData,
  });
}

export function useCloseReport() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, resolution }: { id: string; status: 'RESOLVED' | 'DISMISSED'; resolution: string }) =>
      (await unwrap(client.POST('/api/v1/admin/reports/{id}/close', { params: { path: { id } }, body: { status, resolution } }))).report,
    onSettled: () => void queryClient.invalidateQueries({ queryKey: adminKeys.all }),
  });
}

export function useAdminAnalytics(days: 7 | 30 | 90) {
  const client = useApiClient();
  return useQuery({
    queryKey: ['admin', 'analytics', days] as const,
    queryFn: async () => unwrap(client.GET('/api/v1/admin/analytics', { params: { query: { days } } })),
    placeholderData: keepPreviousData,
  });
}

export function useAdminSeo() {
  const client = useApiClient();
  return useQuery({ queryKey: ['admin', 'seo'] as const, queryFn: async () => unwrap(client.GET('/api/v1/admin/seo')) });
}

export function useAdminAudit(action: string | undefined, page: number) {
  const client = useApiClient();
  return useQuery({
    queryKey: ['admin', 'audit', action ?? 'all', page] as const,
    queryFn: async () =>
      unwrap(client.GET('/api/v1/admin/audit', { params: { query: { page, ...(action ? { action: action as never } : {}) } } })),
    placeholderData: keepPreviousData,
  });
}

export function useAdminSettings() {
  const client = useApiClient();
  return useQuery({ queryKey: ['admin', 'settings'] as const, queryFn: async () => unwrap(client.GET('/api/v1/admin/settings')) });
}

export function useSaveAdminSettings() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (change: Record<string, number | string>) => unwrap(client.PUT('/api/v1/admin/settings', { body: change as never })),
    onSuccess: (data) => queryClient.setQueryData(['admin', 'settings'], data),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ['admin', 'audit'] }),
  });
}
