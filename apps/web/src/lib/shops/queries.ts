'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ShopInput } from '@yoyo/shared';
import { unwrap } from '@/lib/session/api-error';
import { useApiClient, useSession } from '@/lib/session/SessionProvider';

export const shopKeys = {
  ofUser: (userId: string) => ['shops', 'user', userId] as const,
  one: (id: string) => ['shops', 'one', id] as const,
  mine: ['shops', 'mine'] as const,
};

export function useUserShops(userId: string) {
  const client = useApiClient();
  return useQuery({ queryKey: shopKeys.ofUser(userId), queryFn: async () => (await unwrap(client.GET('/api/v1/users/{id}/shops', { params: { path: { id: userId } } }))).items });
}

export function useShop(id: string) {
  const client = useApiClient();
  return useQuery({ queryKey: shopKeys.one(id), queryFn: async () => unwrap(client.GET('/api/v1/shops/{id}', { params: { path: { id } } })), retry: false });
}

export function useMyShops() {
  const client = useApiClient();
  const { status } = useSession();
  return useQuery({ queryKey: shopKeys.mine, queryFn: async () => (await unwrap(client.GET('/api/v1/me/shops'))).items, enabled: status === 'authenticated' });
}

export function useSaveShop() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string | null; body: ShopInput }) =>
      id ? unwrap(client.PATCH('/api/v1/me/shops/{id}', { params: { path: { id } }, body })) : unwrap(client.POST('/api/v1/me/shops', { body })),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ['shops'] }),
  });
}

export function useDeleteShop() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await unwrap(client.DELETE('/api/v1/me/shops/{id}', { params: { path: { id } } }));
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ['shops'] }),
  });
}
