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
export function MyListings({ initialStatus, embedded = false }: { initialStatus: MyListingsFilter; /** Inside the profile: no page title, the profile already says whose items these are. */ embedded?: boolean }) {
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

  const Wrap = embedded ? 'div' : 'main';
  const items = [...(query.data ?? [])].sort((a, b) => rank(a) - rank(b));
  const counts = ORDER.map((st) => [st, items.filter((l) => l.status === st).length] as const).filter(([, n]) => n > 0);

  return (
    <Wrap className={embedded ? 'flex flex-col gap-8' : 'page flex flex-col gap-8 page-y'}>
      {embedded ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-ink/75 max-w-read leading-relaxed">{t('intro')}</p>
          <Button href="/listings/new" size="md">
            <span aria-hidden="true">+</span> {t('lend')}
          </Button>
        </div>
      ) : (
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="@container flex min-w-0 flex-1 flex-col gap-2">
            <h1
              style={displayFit(t('title'), { max: '3.5rem' })}
              className="font-display text-display-fit leading-[0.85] font-black uppercase"
            >
              {t('title')}
            </h1>
            <p className="leading-relaxed">{t('intro')}</p>
          </div>
          <Button href="/listings/new" size="lg" className="self-start sm:self-auto">
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
        <ul aria-busy="true" className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
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
          className="border-ink/15 bg-surface rounded-media flex flex-col items-start gap-3 border p-6"
        >
          <p className="font-bold">{t('loadFailed')}</p>
          <p>{errorText(query.error)}</p>
          <Button variant="ghost" onClick={() => void query.refetch()}>
            {t('retry')}
          </Button>
        </div>
      ) : items.length === 0 ? (
        (
          <EmptyState
            title={t('emptyTitle')}
            body={t('emptyBody')}
            action={
              <Button href="/listings/new" size="lg">
                {t('lend')}
              </Button>
            }
          />
        )
      ) : (
        <>
          <p className="sr-only" role="status">
            {t('count', { count: items.length })}
          </p>
          <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((listing) => (
              <li key={listing.id}>
                <MyListingCard listing={listing} perform={(action) => perform(listing.id, action)} />
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Deleted items stay out of the way: asked for only when opened. */}
      <section className="border-ink/15 flex flex-col gap-4 border-t pt-6">
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
            <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {(deleted.data ?? []).map((listing) => (
                <li key={listing.id}>
                  <MyListingCard listing={listing} perform={(action) => perform(listing.id, action)} />
                </li>
              ))}
            </ul>
          ))}
      </section>
    </Wrap>
  );
}
