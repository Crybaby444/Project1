'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ListingCard } from '@/components/catalog/ListingCard';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Link } from '@/i18n/navigation';
import { useFollowFeed, useFollowing } from '@/lib/people/queries';
import { PersonCard } from './PersonCard';

/** Dashboard → Following: new items from the people you follow, and the people themselves. */
export function FollowingView() {
  const t = useTranslations('people');
  const [page, setPage] = useState(1);
  const feed = useFollowFeed(page);
  const people = useFollowing();
  const pages = Math.max(1, Math.ceil((feed.data?.total ?? 0) / 24));

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-display-l leading-[0.9] font-black uppercase">{t('feedTitle')}</h1>
        <p className="text-ink/75">{t('feedIntro')}</p>
      </header>
      {people.data && people.data.length === 0 ? (
        <EmptyState headingLevel={2} title={t('nobody')} body={t('nobodyHint')} action={<Button href="/c">{t('browse')}</Button>} />
      ) : (
        <>
          <section aria-labelledby="feed-items" className="flex flex-col gap-4">
            <h2 id="feed-items" className="font-display text-4xl leading-none font-black uppercase">
              {t('newItems')}
            </h2>
            {feed.data && feed.data.items.length === 0 && <p className="text-ink/75">{t('noNewItems')}</p>}
            <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 xl:grid-cols-4">
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
          <section aria-labelledby="feed-people" className="flex flex-col gap-4">
            <h2 id="feed-people" className="font-display text-4xl leading-none font-black uppercase">
              {t('youFollow', { count: people.data?.length ?? 0 })}
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {people.data?.map((p) => (
                <PersonCard key={p.id} person={p} />
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
