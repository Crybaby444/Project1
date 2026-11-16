'use client';

import type { CatalogItem } from '@yoyo/shared';
import { useTranslations } from 'next-intl';
import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { ListingCard } from '@/components/catalog/ListingCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ReviewsFeed } from '@/components/reviews/ReviewsFeed';
import { ShopsGrid } from '@/components/shops/ShopCard';
import { useFavorites } from '@/lib/catalog/use-favorites';
import { useSession } from '@/lib/session/SessionProvider';

const PUBLIC_TABS = ['items', 'shops', 'reviews'] as const;
/** Your own profile also holds what only you see (owner, 2026-11-16: favourites live in the profile). */
const OWN_TABS = [...PUBLIC_TABS, 'favorites'] as const;
type Tab = (typeof OWN_TABS)[number];

/**
 * A profile's two tabs (WAI-ARIA tabs, arrows move between them): the person's items in the catalog,
 * and their reviews, which arrive with plan 10 (until then a placeholder).
 */
export function ProfileTabs({ listings, name, userId }: { listings: CatalogItem[]; name: string; userId: string }) {
  const t = useTranslations('profile');
  const base = useId();
  const { user } = useSession();
  const mine = user?.id === userId;
  const TABS: readonly Tab[] = mine ? OWN_TABS : PUBLIC_TABS;
  const [tab, setTab] = useState<Tab>('items');
  const buttons = useRef<Record<Tab, HTMLButtonElement | null>>({ items: null, shops: null, reviews: null, favorites: null });
  const favorites = useFavorites();

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    const at = TABS.indexOf(tab);
    const next =
      event.key === 'Home' ? TABS[0]! : event.key === 'End' ? TABS[TABS.length - 1]! : TABS[(at + (event.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length]!;
    setTab(next);
    buttons.current[next]?.focus();
  }

  return (
    <div className="flex flex-col gap-6">
      <div role="tablist" aria-label={t('tabs', { name })} className="border-ink/15 -mx-4 flex overflow-x-auto border-b px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
        {TABS.map((key) => (
          <button
            key={key}
            ref={(element) => {
              buttons.current[key] = element;
            }}
            type="button"
            role="tab"
            id={`${base}-${key}-tab`}
            aria-selected={tab === key}
            aria-controls={`${base}-${key}`}
            tabIndex={tab === key ? 0 : -1}
            onClick={() => setTab(key)}
            onKeyDown={onKeyDown}
            className={`relative inline-flex min-h-12 shrink-0 items-center px-4 text-[15px] font-bold whitespace-nowrap transition-colors ${
              tab === key ? 'text-ink after:bg-ink after:absolute after:inset-x-3 after:-bottom-px after:h-[3px] after:rounded-full' : 'text-ink/65 hover:text-ink'
            }`}
          >
            {key === 'items' ? t('items', { count: listings.length }) : key === 'shops' ? t('shops') : key === 'reviews' ? t('reviews') : t('favorites')}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${base}-items`} aria-labelledby={`${base}-items-tab`} hidden={tab !== 'items'}>
        {listings.length === 0 ? (
          <EmptyState headingLevel={3} title={t('noItems', { name })} />
        ) : (
          <ul className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-4 lg:grid-cols-4">
            {listings.map((item, index) => (
              <li key={item.id}>
                <ListingCard item={item} eager={index < 4} />
              </li>
            ))}
          </ul>
        )}
      </div>
      <div role="tabpanel" id={`${base}-shops`} aria-labelledby={`${base}-shops-tab`} hidden={tab !== 'shops'}>
        {tab === 'shops' && <ShopsGrid userId={userId} empty={<EmptyState headingLevel={3} title={t('noShops', { name })} />} />}
      </div>
      {mine && (
        <div role="tabpanel" id={`${base}-favorites`} aria-labelledby={`${base}-favorites-tab`} hidden={tab !== 'favorites'}>
          {(favorites.data ?? []).length === 0 ? (
            <EmptyState headingLevel={3} title={t('noFavorites')} />
          ) : (
            <ul className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-4 lg:grid-cols-4">
              {(favorites.data ?? []).map((item) => (
                <li key={item.id}>
                  <ListingCard item={item} unavailable={!item.available} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div role="tabpanel" id={`${base}-reviews`} aria-labelledby={`${base}-reviews-tab`} hidden={tab !== 'reviews'}>
        <ReviewsFeed source={{ kind: 'user', id: userId }} empty={<EmptyState headingLevel={3} title={t('noReviewsTitle')} body={t('noReviewsBody')} />} />
      </div>
    </div>
  );
}
