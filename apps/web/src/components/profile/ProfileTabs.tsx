'use client';

import type { CatalogItem } from '@yoyo/shared';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { ListingCard } from '@/components/catalog/ListingCard';
import { FavoritesList } from '@/components/favorites/FavoritesList';
import { MyListings, type MyListingsFilter } from '@/components/listings/MyListings';
import { FollowingView } from '@/components/people/FollowingView';
import { ReviewsFeed } from '@/components/reviews/ReviewsFeed';
import { MyShops } from '@/components/shops/MyShops';
import { ShopsGrid } from '@/components/shops/ShopCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { useSession } from '@/lib/session/SessionProvider';
import type { ProfileTab } from './profile-tabs';


const PUBLIC_TABS: readonly ProfileTab[] = ['items', 'shops', 'reviews'];
/**
 * Your own profile is the one place for everything that is yours (owner, 2026-11-19: no separate
 * "My items / Favourites / Following / My shops" pages, all of it lives in the profile).
 */
const OWN_TABS: readonly ProfileTab[] = ['items', 'favorites', 'following', 'shops', 'reviews'];

/**
 * A profile's tabs (WAI-ARIA tabs, arrows move between them). Anyone sees the person's items, shops
 * and reviews. On your own profile the items tab manages every item you have (drafts, in review,
 * hidden), and favourites and the people you follow join in. The open tab is kept in `?tab=` so a
 * link or the back button lands on it.
 */
export function ProfileTabs({
  listings,
  name,
  userId,
  initialTab = 'items',
  initialStatus = 'ALL',
}: {
  listings: CatalogItem[];
  name: string;
  userId: string;
  initialTab?: ProfileTab;
  /** For your own items: `ARCHIVED` opens the deleted ones. */
  initialStatus?: MyListingsFilter;
}) {
  const t = useTranslations('profile');
  const tm = useTranslations('mySpace');
  const base = useId();
  const { user } = useSession();
  const mine = user?.id === userId;
  const tabs = mine ? OWN_TABS : PUBLIC_TABS;
  const [wanted, setWanted] = useState<ProfileTab>(initialTab);
  // A tab only you have, asked for before the session is known (or on someone else's page): items.
  const tab = tabs.includes(wanted) ? wanted : 'items';
  const buttons = useRef<Partial<Record<ProfileTab, HTMLButtonElement | null>>>({});

  // Keep the address in step, without a navigation (the page stays, nothing reloads).
  useEffect(() => {
    if (!tabs.includes(wanted)) return;
    const url = new URL(window.location.href);
    if (wanted === 'items') url.searchParams.delete('tab');
    else url.searchParams.set('tab', wanted);
    if (wanted !== 'items') url.searchParams.delete('status');
    if (url.href !== window.location.href) window.history.replaceState(window.history.state, '', url);
  }, [wanted, tabs]);

  function choose(next: ProfileTab) {
    setWanted(next);
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    const at = tabs.indexOf(tab);
    const next =
      event.key === 'Home'
        ? tabs[0]!
        : event.key === 'End'
          ? tabs[tabs.length - 1]!
          : tabs[(at + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length]!;
    choose(next);
    buttons.current[next]?.focus();
  }

  const label = (key: ProfileTab) => {
    if (key === 'items') return mine ? tm('tabs.lending') : t('items', { count: listings.length });
    if (key === 'favorites') return tm('tabs.favorites');
    if (key === 'following') return tm('tabs.following');
    if (key === 'shops') return mine ? tm('tabs.shops') : t('shops');
    return t('reviews');
  };

  const panel = (key: ProfileTab) => ({
    role: 'tabpanel' as const,
    id: `${base}-${key}`,
    'aria-labelledby': `${base}-${key}-tab`,
    hidden: tab !== key,
  });

  return (
    <div className="flex flex-col gap-8" data-profile-tabs="">
      <div
        role="tablist"
        aria-label={t('tabs', { name })}
        className="border-ink/15 -mx-4 flex overflow-x-auto border-b px-4 [scrollbar-width:none] sm:mx-0 sm:px-0"
      >
        {tabs.map((key) => (
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
            onClick={() => choose(key)}
            onKeyDown={onKeyDown}
            className={`relative inline-flex min-h-12 shrink-0 items-center px-4 text-base font-bold whitespace-nowrap transition-colors ${
              tab === key
                ? 'text-ink after:bg-ink after:absolute after:inset-x-3 after:-bottom-px after:h-[3px] after:rounded-full'
                : 'text-ink/65 hover:text-ink'
            }`}
          >
            {label(key)}
          </button>
        ))}
      </div>

      <div {...panel('items')}>
        {mine ? (
          <MyListings embedded initialStatus={initialStatus} />
        ) : listings.length === 0 ? (
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
      {mine && <div {...panel('favorites')}>{tab === 'favorites' && <FavoritesList embedded />}</div>}
      {mine && <div {...panel('following')}>{tab === 'following' && <FollowingView embedded />}</div>}
      <div {...panel('shops')}>
        {tab === 'shops' &&
          (mine ? (
            <MyShops embedded />
          ) : (
            <ShopsGrid userId={userId} empty={<EmptyState headingLevel={3} title={t('noShops', { name })} />} />
          ))}
      </div>
      <div {...panel('reviews')}>
        {tab === 'reviews' && (
          <ReviewsFeed
            source={{ kind: 'user', id: userId }}
            empty={<EmptyState headingLevel={3} title={t('noReviewsTitle')} body={t('noReviewsBody')} />}
          />
        )}
      </div>
    </div>
  );
}
