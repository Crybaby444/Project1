'use client';

import { displayFit } from '@/lib/display-fit';
import { useQueryClient } from '@tanstack/react-query';
import { type ListingStatus } from '@yoyo/shared';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useErrorText } from '@/lib/forms/error-text';
import { useMyListings } from '@/lib/listings/queries';
import { unwrap } from '@/lib/session/api-error';
import { useApiClient } from '@/lib/session/SessionProvider';
import type { ListingAction } from './ListingActions';
import { MyListingCard } from './MyListingCard';
import { EmptyState } from '@/components/ui/EmptyState';

export type MyListingsFilter = ListingStatus | 'ALL';
/** What needs you first (owner, 2026-11-16: one list with statuses, no row of filters). */
const ORDER: ListingStatus[] = ['REJECTED', 'DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'HIDDEN'];
const rank = (l: { status: ListingStatus }) => {
  const at = ORDER.indexOf(l.status);
  return at === -1 ? ORDER.length : at;
};

/**
 * "My items" (spec §4.2): every listing of the owner in one list, each with its status, what needs you
 * first (rejected, drafts), then in review, live and hidden. A line under the title counts them by status.
 * Deleted listings are asked for only when you open them at the foot (or with `?status=ARCHIVED`).
 */
/**
 * `embedded`: inside the own profile's Items tab (owner, 2026-11-19: no separate dashboard), without the
 * page frame and title; the tab names it.
 */
export function MyListings({
  initialStatus,
  embedded = false,
}: {
  initialStatus: MyListingsFilter;
  embedded?: boolean;
}) {
  const Wrapper = embedded ? 'div' : 'main';
  const t = useTranslations('myListings');
  const errorText = useErrorText();
  const client = useApiClient();
  const queryClient = useQueryClient();
  const query = useMyListings('ALL');
  const [showDeleted, setShowDeleted] = useState(initialStatus === 'ARCHIVED');
  const deleted = useMyListings(showDeleted ? 'ARCHIVED' : null);

  async function perform(id: string, action: ListingAction) {
    const path = { params: { path: { id } } };
    if (action === 'delete') await unwrap(client.DELETE('/api/v1/listings/{id}', path));
    else if (action === 'hide') await unwrap(client.POST('/api/v1/listings/{id}/hide', path));
    else await unwrap(client.POST('/api/v1/listings/{id}/unhide', path));
    await queryClient.invalidateQueries({ queryKey: ['listings'] });
  }

  const items = [...(query.data ?? [])].sort((a, b) => rank(a) - rank(b));
  const counts = ORDER.map((st) => [st, items.filter((l) => l.status === st).length] as const).filter(
    ([, n]) => n > 0,
  );

  return (
    <Wrapper className={embedded ? 'flex flex-col gap-8' : 'page page-y flex flex-col gap-8'}>
      {embedded ? (
        // With nothing yet, the empty state below carries the one Lend button (the header has its own).
        items.length > 0 && (
          <div className="flex justify-end">
            <Button href="/listings/new">
              <span aria-hidden="true">+</span> {t('lend')}
            </Button>
          </div>
        )
      ) : (
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="@container flex min-w-0 flex-1 flex-col gap-2">
            <h1
              style={displayFit(t('title'), { max: '3.5rem' })}
              className="font-display text-display-fit leading-[0.85] font-black uppercase"
            >
              {t('title')}
            </h1>
          </div>
          <Button href="/listings/new" className="self-start sm:self-auto">
            <span aria-hidden="true">+</span> {t('lend')}
          </Button>
        </header>
      )}

      {counts.length > 0 && (
        <p className="text-ink/75 -mt-4 flex flex-wrap gap-x-4 gap-y-1 text-base" data-status-summary="">
          {counts.map(([st, n]) => (
            <span key={st}>
              <b className="text-ink tabular-nums">{n}</b> {t(`filter.${st}`).toLowerCase()}
            </span>
          ))}
        </p>
      )}

      {query.isPending ? (
        <ul aria-busy="true" className="grid-tiles">
          {[0, 1, 2].map((key) => (
            <li
              key={key}
              aria-hidden="true"
              className="border-ink/20 bg-surface rounded-media h-96 animate-pulse border"
            />
          ))}
        </ul>
      ) : query.isError ? (
        <div
          role="alert"
          className="sheet border-ink/15 rounded-media flex flex-col items-start gap-3 border p-5 sm:p-6"
        >
          <p className="font-bold">{t('loadFailed')}</p>
          <p>{errorText(query.error)}</p>
          <Button variant="ghost" onClick={() => void query.refetch()}>
            {t('retry')}
          </Button>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title={t('emptyTitle')}
          body={t('emptyBody')}
          action={
            <Button href="/listings/new">
              {t('lend')}
            </Button>
          }
        />
      ) : (
        <>
          <p className="sr-only" role="status">
            {t('count', { count: items.length })}
          </p>
          <ul className="grid-tiles">
            {items.map((listing) => (
              <li key={listing.id}>
                <MyListingCard listing={listing} perform={(action) => perform(listing.id, action)} />
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Deleted items stay out of the way: asked for only when opened. */}
      <section className={`flex flex-col gap-4 ${embedded ? '' : 'border-ink/15 border-t pt-6'}`}>
        <button
          type="button"
          aria-expanded={showDeleted}
          onClick={() => setShowDeleted((open) => !open)}
          className="text-ink/75 hover:text-ink self-start text-base font-bold underline decoration-1 underline-offset-4"
        >
          {showDeleted ? t('deleted.hide') : t('deleted.show')}
        </button>
        {showDeleted &&
          (deleted.isPending ? (
            <p className="text-ink/70 text-sm">{t('deleted.loading')}</p>
          ) : (deleted.data ?? []).length === 0 ? (
            <p className="text-ink/70 text-sm">{t('deleted.none')}</p>
          ) : (
            <ul className="grid-tiles">
              {(deleted.data ?? []).map((listing) => (
                <li key={listing.id}>
                  <MyListingCard listing={listing} perform={(action) => perform(listing.id, action)} />
                </li>
              ))}
            </ul>
          ))}
      </section>
    </Wrapper>
  );
}
