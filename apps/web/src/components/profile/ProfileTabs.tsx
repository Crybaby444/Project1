'use client';

import type { CatalogItem } from '@yoyo/shared';
import { useTranslations } from 'next-intl';
import { LISTING_STATUSES } from '@yoyo/shared';
import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { MyListings, type MyListingsFilter } from '@/components/listings/MyListings';
import { FollowingView } from '@/components/people/FollowingView';
import { MyShops } from '@/components/shops/MyShops';
import { ListingCard } from '@/components/catalog/ListingCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ReviewsFeed } from '@/components/reviews/ReviewsFeed';
import { ShopsGrid } from '@/components/shops/ShopCard';
import { useFavorites } from '@/lib/catalog/use-favorites';
import { useMyListings } from '@/lib/listings/queries';
import { useUserShops } from '@/lib/shops/queries';
import { useFollowing } from '@/lib/people/queries';
import { useSession } from '@/lib/session/SessionProvider';

const PUBLIC_TABS = ['items', 'shops', 'reviews'] as const;
/**
 * Your own profile also holds what only you see and manage (owner: favourites live in the profile,
 * 2026-11-16; no separate dashboard, 2026-11-19): every item of yours in any status, your shops to
 * edit, favourites and the people you follow.
 */
const OWN_TABS = ['items', 'shops', 'favorites', 'following', 'reviews'] as const;
type Tab = (typeof OWN_TABS)[number];
const isTab = (value: string | null): value is Tab => (OWN_TABS as readonly string[]).includes(value ?? '');

/**
 * A profile's tabs (WAI-ARIA tabs, arrows move between them), each with how many it holds. Anyone sees the
 * person's items, shops and reviews; your own profile adds favourites and the people you follow, and its
 * items tab manages every item you have. Every panel is just its list, or a short empty state (owner,
 * 2026-11-28: no line explaining what a tab is).
 */
export function ProfileTabs({ listings, name, userId, reviewCount = 0 }: { listings: CatalogItem[]; name: string; userId: string; reviewCount?: number }) {
  const t = useTranslations('profile');
  const base = useId();
  const { user } = useSession();
  const mine = user?.id === userId;
  // A visitor sees a shops tab only when there are shops to see (owner, 2026-11-26: nothing empty for show).
  const theirShops = useUserShops(userId);
  const TABS: readonly Tab[] = mine ? OWN_TABS : PUBLIC_TABS.filter((key) => key !== 'shops' || (theirShops.data?.length ?? 0) > 0);
  const [tab, setTabState] = useState<Tab>('items');
  const [status, setStatus] = useState<MyListingsFilter>('ALL');
  const buttons = useRef<Record<Tab, HTMLButtonElement | null>>({ items: null, shops: null, reviews: null, favorites: null, following: null });

  // `?tab=` and `?status=` open a tab (links from the listing builder, old /dashboard addresses).
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const asked = query.get('tab');
    const wanted = query.get('status');
    /* eslint-disable react-hooks/set-state-in-effect -- read once from the address after hydration */
    if (isTab(asked) && TABS.includes(asked)) setTabState(asked);
    if (wanted && (LISTING_STATUSES as readonly string[]).includes(wanted)) setStatus(wanted as MyListingsFilter);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [mine]); // eslint-disable-line react-hooks/exhaustive-deps -- TABS follows `mine`

  function setTab(next: Tab) {
    setTabState(next);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', next);
    url.searchParams.delete('status');
    window.history.replaceState(window.history.state, '', url);
  }
  const favorites = useFavorites();
  // How many each tab holds, beside its name (owner, 2026-11-26: the profile reads at a glance).
  const mineAll = useMyListings(mine ? 'ALL' : null);
  const followingList = useFollowing();
  const counts: Partial<Record<Tab, number | undefined>> = {
    items: mine ? mineAll.data?.length : listings.length,
    favorites: mine ? favorites.data?.length : undefined,
    following: mine ? followingList.data?.length : undefined,
    reviews: reviewCount,
    shops: mine ? undefined : theirShops.data?.length,
  };

  // The blue pill under the chosen tab (owner, 2026-11-28: "make this selection more beautiful"): it slides
  // to the tab that is opened. Until it is measured, the chosen tab paints its own pill.
  const track = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState<{ x: number; w: number } | null>(null);
  useLayoutEffect(() => {
    const element = track.current;
    if (!element) return;
    const place = () => {
      const chosen = buttons.current[tab];
      setPill(chosen ? { x: chosen.offsetLeft, w: chosen.offsetWidth } : null);
    };
    place();
    // The counts arrive after the first paint and widen the tabs: follow them.
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(place);
    observer.observe(element);
    for (const button of Object.values(buttons.current)) if (button) observer.observe(button);
    return () => observer.disconnect();
  }, [tab, TABS.length]);

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
      <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
      <div
        ref={track}
        role="tablist"
        aria-label={t('tabs', { name })}
        className="bg-mist/70 border-ink/10 rounded-pill relative flex w-max gap-1 border p-1"
        data-profile-tabs=""
      >
        <span
          aria-hidden="true"
          className="bg-accent rounded-pill pointer-events-none absolute top-1 bottom-1 left-0 shadow-[0_10px_24px_-12px_var(--accent)] transition-[transform,width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
          style={{ width: pill?.w ?? 0, transform: `translateX(${pill?.x ?? 0}px)`, opacity: pill ? 1 : 0 }}
        />
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
            onClick={() => {
              setTab(key);
              buttons.current[key]?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
            }}
            onKeyDown={onKeyDown}
            className={`rounded-pill relative inline-flex min-h-11 shrink-0 items-center gap-2 px-4 text-[15px] font-bold whitespace-nowrap transition-colors duration-300 ${
              tab === key ? `text-accent-fg ${pill ? '' : 'bg-accent'}` : 'text-ink/70 hover:text-ink'
            }`}
          >
            {key === 'items' ? (mine ? t('myItems') : t('itemsTab')) : key === 'following' ? t('following') : t(key)}
            {counts[key] !== undefined && (
              <span
                className={`rounded-pill inline-flex h-6 min-w-6 items-center justify-center px-1.5 text-xs tabular-nums transition-colors duration-300 ${
                  tab === key ? 'bg-[color-mix(in_srgb,var(--accent-fg)_22%,transparent)]' : 'bg-ink/10 text-ink/70'
                }`}
              >
                {counts[key]}
              </span>
            )}
          </button>
        ))}
      </div>
      </div>
      <div role="tabpanel" id={`${base}-items`} aria-labelledby={`${base}-items-tab`} hidden={tab !== 'items'} className="animate-step-in [--step-from:10px]">
        {mine ? (
          tab === 'items' && <MyListings key={status} initialStatus={status} embedded />
        ) : listings.length === 0 ? (
          <EmptyState headingLevel={2} title={t('noItems', { name })} />
        ) : (
          <ul className="grid-cards">
            {listings.map((item, index) => (
              <li key={item.id}>
                <ListingCard item={item} eager={index < 4} />
              </li>
            ))}
          </ul>
        )}
      </div>
      <div role="tabpanel" id={`${base}-shops`} aria-labelledby={`${base}-shops-tab`} hidden={tab !== 'shops'} className="animate-step-in [--step-from:10px]">
        {tab === 'shops' && (mine ? <MyShops embedded /> : <ShopsGrid userId={userId} empty={<EmptyState headingLevel={2} title={t('noShops', { name })} />} />)}
      </div>
      {mine && (
        <div role="tabpanel" id={`${base}-favorites`} aria-labelledby={`${base}-favorites-tab`} hidden={tab !== 'favorites'} className="animate-step-in [--step-from:10px]">
          {(favorites.data ?? []).length === 0 ? (
            <EmptyState headingLevel={2} title={t('noFavoritesTitle')} body={t('noFavoritesBody')} />
          ) : (
            <ul className="grid-cards">
              {(favorites.data ?? []).map((item) => (
                <li key={item.id}>
                  <ListingCard item={item} unavailable={!item.available} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {mine && (
        <div role="tabpanel" id={`${base}-following`} aria-labelledby={`${base}-following-tab`} hidden={tab !== 'following'} className="animate-step-in [--step-from:10px]">
          {tab === 'following' && <FollowingView embedded />}
        </div>
      )}
      <div role="tabpanel" id={`${base}-reviews`} aria-labelledby={`${base}-reviews-tab`} hidden={tab !== 'reviews'} className="animate-step-in [--step-from:10px]">
        {tab === 'reviews' && <ReviewsFeed source={{ kind: 'user', id: userId }} empty={<EmptyState headingLevel={2} title={t('noReviewsTitle')} body={t('noReviewsBody')} />} />}
      </div>
    </div>
  );
}
