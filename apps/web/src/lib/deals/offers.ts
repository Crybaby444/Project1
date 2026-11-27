'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { OfferView } from '@yoyo/shared';
import { useCallback } from 'react';
import { unwrap } from '@/lib/session/api-error';
import { useApiClient, useSession } from '@/lib/session/SessionProvider';
import { useIdempotentMutation } from './idempotency';
import { dealKeys, LIST_POLL_MS } from './queries';

export type OfferRole = 'renter' | 'owner';

/** Under `deals`: private, dropped on sign-out, and refreshed with every deal step. */
export const offerKeys = {
  mine: (role: OfferRole) => [...dealKeys.all, 'offers', role] as const,
};

/** Whether an offer still counts now: waiting for the owner or accepted, and within its time. */
export function isOpen(offer: OfferView, now: number): boolean {
  return (offer.status === 'PENDING' || offer.status === 'ACCEPTED') && Date.parse(offer.expiresAt) > now;
}

/**
 * Price offers (spec §4.6) the person made (renter) or got (owner), newest first. While one waits for an
 * answer, the list follows the other side live.
 */
export function useMyOffers(role: OfferRole, enabled = true) {
  const client = useApiClient();
  const { status } = useSession();
  return useQuery({
    queryKey: offerKeys.mine(role),
    queryFn: async () => (await unwrap(client.GET('/api/v1/me/offers', { params: { query: { role } } }))).items,
    enabled: enabled && status === 'authenticated',
    refetchInterval: (query) => (query.state.data?.some((offer) => offer.status === 'PENDING') ? LIST_POLL_MS : false),
  });
}

/**
 * The renter's offer that speaks for this item now: an accepted or waiting one first, otherwise the last
 * answer (declined, or left unanswered) while its first day is still ahead. Withdrawn and used offers
 * have nothing more to say.
 */
export function offerForItem(offers: readonly OfferView[] | undefined, listingId: string, today: string, now: number): OfferView | null {
  const mine = (offers ?? []).filter((offer) => offer.listing.id === listingId);
  const open = mine.find((offer) => isOpen(offer, now));
  if (open) return open;
  const last = mine[0];
  if (last && (last.status === 'DECLINED' || last.status === 'EXPIRED') && last.start >= today) return last;
  return null;
}

/** After any offer step: the offers of both sides, and the counters of "My deals". */
function useRefreshOffers() {
  const queryClient = useQueryClient();
  return useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: [...dealKeys.all, 'offers'] }),
      queryClient.invalidateQueries({ queryKey: dealKeys.summary }),
    ]);
  }, [queryClient]);
}

/** The renter offers a daily price for some days; a waiting offer for the same item is replaced. */
export function useMakeOffer(listingId: string) {
  const client = useApiClient();
  const refresh = useRefreshOffers();
  return useIdempotentMutation<{ start: string; end: string; dailyCents: number }, OfferView>({
    intent: (vars) => `${listingId}:${JSON.stringify(vars)}`,
    mutate: async (vars, key) => {
      const { offer } = await unwrap(
        client.POST('/api/v1/listings/{id}/offers', {
          params: { path: { id: listingId }, header: { 'Idempotency-Key': key } },
          body: vars,
        }),
      );
      await refresh();
      return offer;
    },
  });
}

/** One answer to an offer: the owner accepts or declines, the renter withdraws. */
export function useOfferStep() {
  const client = useApiClient();
  const refresh = useRefreshOffers();
  return useIdempotentMutation<{ id: string; step: 'accept' | 'decline' | 'withdraw' }, OfferView>({
    intent: (vars) => `${vars.id}:${vars.step}`,
    mutate: async ({ id, step }) => {
      const params = { params: { path: { id } } };
      const { offer } = await unwrap(
        step === 'accept'
          ? client.POST('/api/v1/offers/{id}/accept', params)
          : step === 'decline'
            ? client.POST('/api/v1/offers/{id}/decline', params)
            : client.POST('/api/v1/offers/{id}/withdraw', params),
      );
      await refresh();
      return offer;
    },
  });
}
