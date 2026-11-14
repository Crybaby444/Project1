'use client';

import { useTranslations } from 'next-intl';
import { ListingCard } from '@/components/catalog/ListingCard';
import { Button } from '@/components/ui/Button';
import { useFavorites } from '@/lib/catalog/use-favorites';
import { EmptyState } from '@/components/ui/EmptyState';

/**
 * The signed-in person's favourites, newest first. One that left the catalog (hidden, archived)
 * stays, marked, so its heart can still be taken off. Removing a heart here keeps the card until the
 * list is loaded again, so nothing jumps under the pointer.
 */
export function FavoritesList() {
  const t = useTranslations('favorites');
  const favorites = useFavorites();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-[clamp(2.6rem,6vw,4.8rem)] leading-[0.95] font-black uppercase hyphens-auto [overflow-wrap:anywhere]">{t('title')}</h1>
      {favorites.isPending ? (
        <ul aria-busy="true" className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-4 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <li key={index} aria-hidden="true" className="border-ink/15 bg-mist rounded-media aspect-[4/5] border" />
          ))}
        </ul>
      ) : favorites.isError ? (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p>{t('loadFailed')}</p>
          <Button variant="ghost" onClick={() => void favorites.refetch()}>
            {t('retry')}
          </Button>
        </div>
      ) : favorites.data.length === 0 ? (
        <EmptyState
          title={t('emptyTitle')}
          body={t('emptyBody')}
          action={
            <Button href="/c" size="lg">
              {t('browse')}
            </Button>
          }
        />
      ) : (
        <ul className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-4 lg:grid-cols-4">
          {favorites.data.map((item) => (
            <li key={item.id}>
              <ListingCard item={item} unavailable={!item.available} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
