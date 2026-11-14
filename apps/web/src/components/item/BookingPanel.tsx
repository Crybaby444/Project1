'use client';

import type { AvailableItem } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { BookingPanel as DealBookingPanel } from '@/components/deals/BookingPanel';
import { Button } from '@/components/ui/Button';
import { formatEuros } from '@/lib/listings/money';

/**
 * The booking side of the item page (spec §4.2): the price a day, the weekly discount, the deposit and
 * how long it can be rented, then the deal screens' booking panel (plan 8b: the calendar, the price from
 * the domain rules with the launch offer, the request with an Idempotency-Key). On a phone a bar at the
 * bottom of the screen («from €15 a day · Choose dates») leads to it until the panel itself is in view.
 */
export function BookingPanel({ item }: { item: AvailableItem }) {
  const t = useTranslations('item.booking');
  const locale = useLocale();
  const { listing } = item;
  const daily = listing.dailyCents ?? 0;
  const panel = useRef<HTMLElement>(null);
  const panelInView = useInView(panel);

  return (
    <>
      <section ref={panel} id="booking" aria-label={t('title')} className="flex scroll-mt-24 flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="font-display text-[clamp(3rem,4.4vw,4.2rem)] leading-[0.9] font-black uppercase tabular-nums">{t('perDay', { price: formatEuros(daily, locale) })}</p>
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
          </ul>
        </div>
        <DealBookingPanel listingId={listing.id} layout="stacked" />
      </section>

      {/* Phones: the way to the panel stays at hand while the photos and the description scroll by. */}
      <div
        aria-hidden={panelInView || undefined}
        className={`border-ink bg-surface ease-yoyo fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t px-4 py-3 transition-transform duration-250 motion-reduce:transition-none lg:hidden ${
          panelInView ? 'translate-y-full' : ''
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

/** Whether the element is on the screen (true when the browser cannot tell, so the bar stays away). */
function useInView(ref: RefObject<HTMLElement | null>): boolean {
  const [inView, setInView] = useState(typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry?.isIntersecting ?? false), { threshold: 0.15 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return inView;
}
