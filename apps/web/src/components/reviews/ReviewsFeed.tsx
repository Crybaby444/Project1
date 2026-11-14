'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { unwrap } from '@/lib/session/api-error';
import { useApiClient } from '@/lib/session/SessionProvider';
import { ReviewList } from './ReviewList';
import { Stars } from './Stars';

type Source = { kind: 'user'; id: string } | { kind: 'listing'; id: string };

/**
 * Public reviews of a person or an item, a page at a time ("More reviews"), headed by the average.
 * With none, `empty` (or nothing).
 */
export function ReviewsFeed({ source, heading, empty = null }: { source: Source; heading?: ReactNode; empty?: ReactNode }) {
  const t = useTranslations('reviews');
  const client = useApiClient();
  const query = useInfiniteQuery({
    queryKey: ['reviews', source.kind, source.id],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      source.kind === 'user'
        ? unwrap(client.GET('/api/v1/users/{id}/reviews', { params: { path: { id: source.id }, query: { page: pageParam } } }))
        : unwrap(client.GET('/api/v1/catalog/listings/{id}/reviews', { params: { path: { id: source.id }, query: { page: pageParam } } })),
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
  });

  // Under an item the reviews are extra: if they fail, the page goes on without them.
  if (query.isError) return source.kind === 'listing' ? null : <p className="m-0 text-sm">{t('loadFailed')}</p>;
  if (!query.data) return null;
  const first = query.data.pages[0]!;
  if (first.total === 0) return <>{empty}</>;
  const reviews = query.data.pages.flatMap((page) => page.items);
  return (
    <div className="flex flex-col gap-4" data-reviews-feed={source.kind}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        {heading}
        <p className="m-0 flex items-center gap-3">
          {first.average > 0 && (
            <>
              <span className="font-display text-[2.2rem] leading-none font-black tabular-nums" aria-hidden="true">
                {first.average.toFixed(1)}
              </span>
              <Stars value={first.average} size={16} />
            </>
          )}
          <span className="text-ink/75 text-sm">{t('count', { count: first.total })}</span>
        </p>
      </div>
      <ReviewList reviews={reviews} showItem={source.kind === 'listing'} />
      {query.hasNextPage && (
        <Button variant="ghost" onClick={() => void query.fetchNextPage()} loading={query.isFetchingNextPage} className="self-start">
          {t('more')}
        </Button>
      )}
    </div>
  );
}
