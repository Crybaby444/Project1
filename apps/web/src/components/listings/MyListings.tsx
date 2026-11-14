'use client';

import { displayFit } from '@/lib/display-fit';
import { useQueryClient } from '@tanstack/react-query';
import { LISTING_STATUSES, type ListingStatus } from '@yoyo/shared';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Mark } from '@/components/brand/Mark';
import { useErrorText } from '@/lib/forms/error-text';
import { useMyListings } from '@/lib/listings/queries';
import { unwrap } from '@/lib/session/api-error';
import { useApiClient } from '@/lib/session/SessionProvider';
import type { ListingAction } from './ListingActions';
import { MyListingCard } from './MyListingCard';

export type MyListingsFilter = ListingStatus | 'ALL';
const FILTERS: MyListingsFilter[] = ['ALL', ...LISTING_STATUSES];

/**
 * "My items" (spec §4.2): every listing of the owner with its state, filtered by status (kept in
 * `?status=`, so the view can be bookmarked). Deleted listings are asked for only with their filter.
 */
export function MyListings({ initialStatus }: { initialStatus: MyListingsFilter }) {
  const t = useTranslations('myListings');
  const errorText = useErrorText();
  const client = useApiClient();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<MyListingsFilter>(initialStatus);
  const query = useMyListings(status);

  function choose(next: MyListingsFilter) {
    setStatus(next);
    const url = new URL(window.location.href);
    if (next === 'ALL') url.searchParams.delete('status');
    else url.searchParams.set('status', next);
    window.history.replaceState(window.history.state, '', url);
  }

  async function perform(id: string, action: ListingAction) {
    const path = { params: { path: { id } } };
    if (action === 'delete') await unwrap(client.DELETE('/api/v1/listings/{id}', path));
    else if (action === 'hide') await unwrap(client.POST('/api/v1/listings/{id}/hide', path));
    else await unwrap(client.POST('/api/v1/listings/{id}/unhide', path));
    await queryClient.invalidateQueries({ queryKey: ['listings'] });
  }

  const items = query.data ?? [];

  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 py-10 sm:px-8 sm:py-14">
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

      <div
        role="group"
        aria-label={t('filters')}
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
      >
        {FILTERS.map((filter, index) => (
          <Chip
            key={filter}
            pressed={status === filter}
            onPressedChange={() => choose(filter)}
            tilt={index % 2 ? 'right' : 'left'}
            className="shrink-0"
          >
            {t(`filter.${filter}`)}
          </Chip>
        ))}
      </div>

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
        status === 'ALL' ? (
          <section className="border-ink/15 flex flex-col items-center gap-5 border-y px-6 py-16 text-center">
            <Mark size={96} string={false} className="animate-[spin_6s_linear_infinite] motion-reduce:animate-none" />
            <h2 className="font-display text-[clamp(1.9rem,3.2vw,2.8rem)] leading-[0.95] font-black uppercase">{t('emptyTitle')}</h2>
            <p className="max-w-[52ch] leading-relaxed">{t('emptyBody')}</p>
            <Button href="/listings/new" size="lg">
              {t('lend')}
            </Button>
          </section>
        ) : (
          <p className="border-ink/40 rounded-media border border-dashed p-8 text-center">
            {t('emptyFilter')}
          </p>
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
    </main>
  );
}
