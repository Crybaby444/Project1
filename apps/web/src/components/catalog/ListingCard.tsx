'use client';

import type { CatalogItem } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { ViewTransition } from 'react';
import { Card } from '@/components/ui/Card';
import { Link } from '@/i18n/navigation';
import { formatEuros } from '@/lib/listings/money';
import { listingPath } from '@/lib/seo';
import { HeartButton } from './HeartButton';

/** The shared name of an item's photo in the catalog and on its page: the photo flies between them. */
export const photoTransitionName = (id: string) => `listing-photo-${id}`;

/**
 * A catalog card: cover 4:3 (its box is sized before the photo loads), title, price a day, weekly
 * discount, deposit and district. The whole card is one link; the heart sits on top, outside it.
 */
export function ListingCard({ item, eager = false, unavailable = false }: { item: CatalogItem; eager?: boolean; unavailable?: boolean }) {
  const t = useTranslations('catalog.card');
  const locale = useLocale();
  const place = [item.city, item.district].filter(Boolean).join(', ');

  return (
    <Card interactive className={`group/card relative h-full ${unavailable ? 'opacity-70' : ''}`}>
      <article className="flex h-full flex-col gap-3 p-3">
        <div className="border-ink bg-mist rounded-media relative aspect-[4/3] overflow-hidden border">
          {item.cover ? (
            <ViewTransition name={photoTransitionName(item.id)}>
              {/* eslint-disable-next-line @next/next/no-img-element -- sized by the API's storage, 640×480 */}
              <img
                src={item.cover.card}
                alt=""
                width={640}
                height={480}
                loading={eager ? 'eager' : 'lazy'}
                decoding="async"
                className="ease-yoyo size-full object-cover transition-transform duration-450 group-hover/card:scale-[1.04]"
              />
            </ViewTransition>
          ) : (
            <div className="grid size-full place-items-center text-sm italic">{t('noPhoto')}</div>
          )}
          {item.weeklyDiscountPercent > 0 && !unavailable && (
            <span className="bg-sticker-sun rounded-pill absolute bottom-3 left-3 -rotate-3 border border-black px-2.5 py-0.5 text-xs font-bold text-black">
              {t('weekly', { percent: item.weeklyDiscountPercent })}
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1 px-1 pb-1">
          <h3 className="line-clamp-2 text-base leading-snug font-bold hyphens-auto [overflow-wrap:anywhere]" lang={item.contentLocale}>
            <Link
              href={listingPath(item.id, item.title)}
              className="rounded-[6px] after:absolute after:inset-0 after:rounded-card after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-3 focus-visible:after:outline-ink"
            >
              {item.title}
            </Link>
          </h3>
          {unavailable ? (
            <p className="text-sm font-bold">{t('unavailable')}</p>
          ) : (
            <>
              <p className="text-lg font-bold tabular-nums">{t('perDay', { price: formatEuros(item.dailyCents, locale) })}</p>
              <p className="text-sm">
                {item.depositCents > 0 ? t('deposit', { amount: formatEuros(item.depositCents, locale) }) : t('noDeposit')}
              </p>
              {place && (
                <p className="mt-auto flex items-center gap-1.5 pt-1 text-sm">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 shrink-0">
                    <path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z" fill="none" stroke="currentColor" strokeWidth="1.75" />
                    <circle cx="12" cy="10" r="2.25" fill="none" stroke="currentColor" strokeWidth="1.75" />
                  </svg>
                  <span className="[overflow-wrap:anywhere]">{place}</span>
                </p>
              )}
            </>
          )}
        </div>
      </article>
      <HeartButton listingId={item.id} title={item.title} className="absolute top-5 right-5 z-10" />
    </Card>
  );
}
