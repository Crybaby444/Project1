'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useToast } from '@/components/ui/Toast';
import { useErrorText } from '@/lib/forms/error-text';
import { unwrap } from '@/lib/session/api-error';
import { useApiClient, useSession } from '@/lib/session/SessionProvider';

/** Favourites are private: signing out drops these keys with the rest (SessionProvider). */
export const favoriteKeys = {
  ids: ['favorites', 'ids'] as const,
  list: ['favorites', 'list'] as const,
};

/** The ids of the signed-in person's favourites; a visitor asks nothing. */
export function useFavoriteIds() {
  const client = useApiClient();
  const { status } = useSession();
  return useQuery({
    queryKey: favoriteKeys.ids,
    queryFn: async () => new Set((await unwrap(client.GET('/api/v1/me/favorites/ids'))).ids),
    enabled: status === 'authenticated',
    staleTime: 60_000,
  });
}

export function useFavorites() {
  const client = useApiClient();
  const { status } = useSession();
  return useQuery({
    queryKey: favoriteKeys.list,
    queryFn: async () => (await unwrap(client.GET('/api/v1/me/favorites'))).items,
    enabled: status === 'authenticated',
  });
}

/**
 * Adds or removes one favourite at once on screen (optimistic), then tells the API. A failure puts
 * the heart back and says why. Changes of one item run one after another (`scope`), so the last
 * press is what stays.
 */
export function useToggleFavorite(listingId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const toast = useToast();
  const errorText = useErrorText();
  const t = useTranslations('favorites');
  return useMutation({
    scope: { id: `favorite-${listingId}` },
    mutationFn: async (on: boolean) => {
      const params = { params: { path: { listingId } } };
      await unwrap(on ? client.PUT('/api/v1/me/favorites/{listingId}', params) : client.DELETE('/api/v1/me/favorites/{listingId}', params));
    },
    onMutate: async (on) => {
      await queryClient.cancelQueries({ queryKey: favoriteKeys.ids });
      const before = queryClient.getQueryData<Set<string>>(favoriteKeys.ids);
      const next = new Set(before ?? []);
      if (on) next.add(listingId);
      else next.delete(listingId);
      queryClient.setQueryData(favoriteKeys.ids, next);
      return { before };
    },
    onError: (error, on, context) => {
      queryClient.setQueryData(favoriteKeys.ids, (current: Set<string> | undefined) => {
        const back = new Set(current ?? context?.before ?? []);
        if (on) back.delete(listingId);
        else back.add(listingId);
        return back;
      });
      toast.show(`${on ? t('addFailed') : t('removeFailed')} ${errorText(error)}`);
    },
    onSettled: () => {
      if (queryClient.isMutating({ predicate: (m) => m.options.scope?.id === `favorite-${listingId}` }) <= 1) {
        void queryClient.invalidateQueries({ queryKey: favoriteKeys.ids });
        void queryClient.invalidateQueries({ queryKey: favoriteKeys.list });
      }
    },
  });
}
