'use client';

import type { CatalogItem } from '@yoyo/shared';
import { useTranslations } from 'next-intl';
import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { ListingCard } from '@/components/catalog/ListingCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ReviewsFeed } from '@/components/reviews/ReviewsFeed';

const TABS = ['items', 'reviews'] as const;
type Tab = (typeof TABS)[number];

/**
 * A profile's two tabs (WAI-ARIA tabs, arrows move between them): the person's items in the catalog,
 * and their reviews, which arrive with plan 10 (until then a placeholder).
 */
export function ProfileTabs({ listings, name, userId }: { listings: CatalogItem[]; name: string; userId: string }) {
  const t = useTranslations('profile');
  const base = useId();
  const [tab, setTab] = useState<Tab>('items');
  const buttons = useRef<Record<Tab, HTMLButtonElement | null>>({ items: null, reviews: null });

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    const at = TABS.indexOf(tab);
    const next =
      event.key === 'Home' ? TABS[0] : event.key === 'End' ? TABS[TABS.length - 1]! : TABS[(at + (event.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length]!;
    setTab(next);
    buttons.current[next]?.focus();
  }

  return (
    <div className="flex flex-col gap-6">
      <div role="tablist" aria-label={t('tabs', { name })} className="flex flex-wrap gap-2">
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
            className={`rounded-pill ease-yoyo inline-flex min-h-10 items-center gap-2 border px-4 text-[13px] font-bold tracking-[0.03em] uppercase transition-[transform,background-color] duration-150 hover:-translate-y-0.5 ${
              tab === key ? 'bg-cta text-cta-fg border-cta' : 'border-ink bg-surface text-ink'
            }`}
          >
            {key === 'items' ? t('items', { count: listings.length }) : t('reviews')}
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
      <div role="tabpanel" id={`${base}-reviews`} aria-labelledby={`${base}-reviews-tab`} hidden={tab !== 'reviews'}>
        <ReviewsFeed source={{ kind: 'user', id: userId }} empty={<EmptyState headingLevel={3} title={t('noReviewsTitle')} body={t('noReviewsBody')} />} />
      </div>
    </div>
  );
}
