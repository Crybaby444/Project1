'use client';

import type { CatalogItem } from '@yoyo/shared';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { forgetViewed, recallViewed, RECENT_EVENT, refreshViewed, rememberViewed } from '@/lib/catalog/recently-viewed';
import { useApiClient } from '@/lib/session/SessionProvider';
import { ListingCard } from './ListingCard';

/**
 * "Recently viewed": the items this browser opened, newest first, to come back to while comparing
 * (kept only in this browser). Nothing on a first visit; read after hydration, so the server and the
 * first client render agree.
 */
export function RecentlyViewed({ except }: { except?: string }) {
  const t = useTranslations('catalog.recent');
  const [items, setItems] = useState<CatalogItem[]>([]);
  const client = useApiClient();

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

  // Once per page: ask which remembered items are still there (a removed one must not stay here).
  useEffect(() => {
    const ids = recallViewed().map((item) => item.id);
    if (ids.length === 0) return;
    let live = true;
    client
      .GET('/api/v1/catalog/items', { params: { query: { ids: ids.join(',') } } })
      .then(({ data }) => {
        if (!live || !data) return;
        const next = refreshViewed(data.items);
        setItems(next.filter((item) => item.id !== except));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- checked once per page
  }, [client]);

  if (items.length === 0) return null;
  return (
    <section aria-labelledby="recently-viewed" className="stack-section">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <h2 id="recently-viewed" className="type-section">
          {t('title')}
        </h2>
        <button type="button" onClick={forgetViewed} className="min-h-10 text-sm font-bold underline decoration-1 underline-offset-4">
          {t('clear')}
        </button>
      </div>
      {/* A strip that scrolls sideways on a phone; from sm up the page's card grid, like the cards above it. */}
      <ul className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-x-4 sm:gap-y-8 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
        {items.map((item) => (
          <li key={item.id} className="w-[min(46vw,240px)] shrink-0 snap-start sm:w-auto">
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
