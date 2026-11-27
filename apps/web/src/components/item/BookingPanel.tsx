'use client';

import type { AvailableItem } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { BookingPanel as DealBookingPanel } from '@/components/deals/BookingPanel';
import { MessageOwnerButton } from '@/components/chat/MessageOwnerButton';
import { takesOffers } from '@/components/deals/OfferBox';
import { Button } from '@/components/ui/Button';
import { formatEuros } from '@/lib/listings/money';

/**
 * The booking side of the item page (spec §4.2): the price a day, the weekly discount, the deposit and
 * how long it can be rented, then the deal screens' booking panel (plan 8b: the calendar, the price from
 * the domain rules with a new account's free first month, the request with an Idempotency-Key). On a phone a bar at the
 * bottom of the screen («from €15 a day · Choose dates») leads to it until the panel itself is in view.
 */
export function BookingPanel({ item, similarPath }: { item: AvailableItem; similarPath?: string }) {
  const t = useTranslations('item.booking');
  const locale = useLocale();
  const { listing } = item;
  const daily = listing.dailyCents ?? 0;
  const panel = useRef<HTMLElement>(null);
  const panelInView = useInView(panel);

  return (
    <>
      <section
        ref={panel}
        id="booking"
        aria-label={t('title')}
        className="sheet border-ink rounded-media flex scroll-mt-24 flex-col gap-4 border-2 p-5 sm:p-6"
      >
        <div className="flex flex-col gap-2">
          <p className="type-section tabular-nums">{t('perDay', { price: formatEuros(daily, locale) })}</p>
          <ul className="flex flex-wrap gap-2 text-xs font-bold">
            {listing.weeklyDiscountPercent > 0 && (
              <li className="bg-ink text-canvas rounded-pill inline-flex items-center gap-1.5 px-2.5 py-1 before:size-1.5 before:rounded-full before:bg-[var(--glow)] before:content-['']">
                {t('weekly', { percent: listing.weeklyDiscountPercent })}
              </li>
            )}
            <li className="border-ink rounded-pill border px-2.5 py-0.5">
              {listing.depositCents > 0 ? t('deposit', { amount: formatEuros(listing.depositCents, locale) }) : t('noDeposit')}
            </li>
            <li className="border-ink rounded-pill border px-2.5 py-0.5">
              {listing.minDays === listing.maxDays ? t('exactDays', { days: listing.minDays }) : t('days', { min: listing.minDays, max: listing.maxDays })}
            </li>
            {takesOffers(daily) && <li className="border-ink rounded-pill border px-2.5 py-0.5">{t('offers')}</li>}
          </ul>
        </div>
        <DealBookingPanel listingId={listing.id} layout="stacked" similarPath={similarPath} />
        <MessageOwnerButton ownerId={item.owner.id} about={{ id: listing.id, title: listing.title ?? '' }} />
      </section>

      {/* Phones: the way to the panel stays at hand while the photos and the description scroll by. It floats
          just above the tab bar, which never moves (owner, 2026-11-26). */}
      <div
        aria-hidden={panelInView || undefined}
        data-book-bar={panelInView ? 'away' : 'shown'}
        className={`border-ink bg-surface ease-yoyo fixed inset-x-4 bottom-[calc(max(10px,env(safe-area-inset-bottom))+80px)] z-30 flex items-center justify-between gap-3 rounded-float border py-2 pr-2 pl-4 shadow-[0_18px_40px_-18px_rgba(10,11,14,0.45)] transition-[translate,opacity] duration-300 motion-reduce:transition-none lg:hidden ${
          panelInView ? 'pointer-events-none translate-y-3 opacity-0' : ''
        }`}
      >
        <p className="min-w-0 font-bold tabular-nums">{t('from', { price: formatEuros(daily, locale) })}</p>
        <Button
          tabIndex={panelInView ? -1 : undefined}
          onClick={() => {
            panel.current?.scrollIntoView({ block: 'start' });
            panel.current?.querySelector<HTMLButtonElement>('[role="grid"] button[tabindex="0"]')?.focus({ preventScroll: true });
          }}
        >
          {t('choose')}
        </Button>
      </div>
    </>
  );
}

/**
 * Whether the element is on the screen. It starts true on the server and the client alike (so hydration
 * matches and the bar stays away until the observer says otherwise), and stays true when the browser
 * cannot tell.
 */
function useInView(ref: RefObject<HTMLElement | null>): boolean {
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry?.isIntersecting ?? false), { threshold: 0.15 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return inView;
}
