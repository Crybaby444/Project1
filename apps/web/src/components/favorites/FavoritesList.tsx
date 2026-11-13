'use client';

import { useTranslations } from 'next-intl';
import { ListingCard } from '@/components/catalog/ListingCard';
import { Button } from '@/components/ui/Button';
import { useFavorites } from '@/lib/catalog/use-favorites';

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
      <h1 className="text-4xl leading-tight font-bold">{t('title')}</h1>
      {favorites.isPending ? (
        <ul aria-busy="true" className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <li key={index} aria-hidden="true" className="border-ink bg-mist rounded-media aspect-[4/5] border" />
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
        <div className="border-ink rounded-media flex flex-col items-start gap-3 border border-dashed p-6 sm:p-10">
          <p className="text-2xl font-bold">{t('emptyTitle')}</p>
          <p className="max-w-[52ch]">{t('emptyBody')}</p>
          <Button href="/c">{t('browse')}</Button>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-4">
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
