'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ListingCard } from '@/components/catalog/ListingCard';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Link } from '@/i18n/navigation';
import { useFollowFeed, useFollowing } from '@/lib/people/queries';
import { PersonCard } from './PersonCard';

/** Profile → Following: the people you follow, then what they listed lately. Small section labels, like every profile panel. */
export function FollowingView({ embedded = false }: { embedded?: boolean }) {
  const t = useTranslations('people');
  const [page, setPage] = useState(1);
  const feed = useFollowFeed(page);
  const people = useFollowing();
  const pages = Math.max(1, Math.ceil((feed.data?.total ?? 0) / 24));

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        {!embedded && <h1 className="type-title">{t('feedTitle')}</h1>}
        <p className="text-ink/75 max-w-read leading-relaxed">{t('feedIntro')}</p>
      </header>
      {people.data && people.data.length === 0 ? (
        <EmptyState headingLevel={2} title={t('nobody')} body={t('nobodyHint')} action={<Button href="/c">{t('browse')}</Button>} />
      ) : (
        <>
          <section aria-labelledby="feed-people" className="flex flex-col gap-4">
            <h2 id="feed-people" className="text-ink/70 type-label">
              {t('youFollow', { count: people.data?.length ?? 0 })}
            </h2>
            <ul className="grid-tiles">
              {people.data?.map((p) => (
                <PersonCard key={p.id} person={p} />
              ))}
            </ul>
          </section>
          <section aria-labelledby="feed-items" className="flex flex-col gap-4">
            <h2 id="feed-items" className="text-ink/70 type-label">
              {t('newItems')}
            </h2>
            {feed.data && feed.data.items.length === 0 && <p className="text-ink/75">{t('noNewItems')}</p>}
            <ul className="grid-cards">
              {feed.data?.items.map((item) => (
                <li key={item.id} className="flex flex-col gap-2">
                  <ListingCard item={item} />
                  <Link href={`/u/${item.owner.id}`} className="text-ink/75 text-sm font-semibold underline-offset-4 hover:underline">
                    {item.owner.name}
                  </Link>
                </li>
              ))}
            </ul>
            {pages > 1 && (
              <div className="flex gap-2">
                <Button variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  ←
                </Button>
                <Button variant="ghost" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                  →
                </Button>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
