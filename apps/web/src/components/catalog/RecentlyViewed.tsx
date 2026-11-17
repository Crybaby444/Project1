'use client';

import type { CatalogItem } from '@yoyo/shared';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { forgetViewed, recallViewed, RECENT_EVENT, rememberViewed } from '@/lib/catalog/recently-viewed';
import { ListingCard } from './ListingCard';

/**
 * "Recently viewed": the items this browser opened, newest first, to come back to while comparing
 * (kept only in this browser). Nothing on a first visit; read after hydration, so the server and the
 * first client render agree.
 */
export function RecentlyViewed({ except }: { except?: string }) {
  const t = useTranslations('catalog.recent');
  const [items, setItems] = useState<CatalogItem[]>([]);

  useEffect(() => {
    const read = () => setItems(recallViewed().filter((i) => i.id !== except));
    read();
    window.addEventListener(RECENT_EVENT, read);
    window.addEventListener('storage', read);
    return () => {
      window.removeEventListener(RECENT_EVENT, read);
      window.removeEventListener('storage', read);
    };
  }, [except]);

  if (items.length === 0) return null;
  return (
    <section aria-labelledby="recently-viewed" className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="recently-viewed" className="font-display text-display-s leading-none font-black uppercase">
          {t('title')}
        </h2>
        <button type="button" onClick={forgetViewed} className="min-h-10 text-sm font-bold underline decoration-1 underline-offset-4">
          {t('clear')}
        </button>
      </div>
      <ul className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {items.map((item) => (
          <li key={item.id} className="w-[min(46vw,240px)] shrink-0 snap-start">
            <ListingCard item={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Put on an item page: remembers the item for the strip above (no markup). */
export function RememberViewed({ item }: { item: CatalogItem }) {
  useEffect(() => rememberViewed(item), [item]);
  return null;
}
