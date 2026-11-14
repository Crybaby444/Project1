'use client';

import type { CatalogItem } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useRef, type CSSProperties } from 'react';
import { TransitionLink } from '@/components/motion';
import { formatEuros } from '@/lib/listings/money';
import { listingPath } from '@/lib/seo';
import { HeartButton } from './HeartButton';

/** The shared name of an item's photo in the catalog and on its page: the photo flies between them. */
export const photoTransitionName = (id: string) => `listing-photo-${id}`;

/**
 * Style and attribute that give a photo its shared name during a page switch (globals.css: only under
 * `html[data-page-switch]`, so the language and theme switches never see it).
 */
export const sharedPhotoStyle = (id: string) =>
  ({ '--shared-photo': photoTransitionName(id) }) as CSSProperties;

/**
 * A catalog card: cover 4:3 (its box is sized before the photo loads), title, price a day, weekly
 * discount, deposit and district. The whole card is one link; the heart sits on top, outside it.
 */
export function ListingCard({
  item,
  eager = false,
  unavailable = false,
}: {
  item: CatalogItem;
  eager?: boolean;
  unavailable?: boolean;
}) {
  const t = useTranslations('catalog.card');
  const locale = useLocale();
  const place = [item.city, item.district].filter(Boolean).join(', ');
  const photo = useRef<HTMLImageElement>(null);

  return (
    <div className={`group/card relative h-full ${unavailable ? 'opacity-70' : ''}`}>
      <article className="flex h-full flex-col gap-3">
        <div className="border-ink/15 bg-mist rounded-media relative aspect-[4/3] overflow-hidden border">
          {item.cover ? (
            // eslint-disable-next-line @next/next/no-img-element -- sized by the API's storage, 640×480
            <img
              ref={photo}
              style={sharedPhotoStyle(item.id)}
              src={item.cover.card}
              alt=""
              width={640}
              height={480}
              loading={eager ? 'eager' : 'lazy'}
              decoding="async"
              className="ease-yoyo size-full object-cover transition-transform duration-450 group-hover/card:scale-[1.04]"
            />
          ) : (
            <div className="text-ink/70 grid size-full place-items-center text-sm font-bold">{t('noPhoto')}</div>
          )}
          {item.weeklyDiscountPercent > 0 && !unavailable && (
            <span className="rounded-pill bg-ink text-canvas absolute bottom-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold">
              <i aria-hidden="true" className="size-1.5 rounded-full bg-[var(--glow)]" />
              {t('weekly', { percent: item.weeklyDiscountPercent })}
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <h3
            className="line-clamp-2 text-base leading-snug font-bold [overflow-wrap:break-word]"
            lang={item.contentLocale}
          >
            <TransitionLink
              href={listingPath(item.id, item.title)}
              // Only the photo of the card that was opened flies to the item page.
              onClick={() => photo.current?.setAttribute('data-shared-photo', '')}
              className="after:rounded-media focus-visible:after:outline-ink rounded-[6px] after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-3"
            >
              {item.title}
            </TransitionLink>
          </h3>
          {unavailable ? (
            <p className="text-sm font-bold">{t('unavailable')}</p>
          ) : (
            <>
              <p className="font-display text-[1.7rem] leading-[0.9] font-black uppercase tabular-nums">
                {t('perDay', { price: formatEuros(item.dailyCents, locale) })}
              </p>
              <p className="text-sm">
                {item.depositCents > 0
                  ? t('deposit', { amount: formatEuros(item.depositCents, locale) })
                  : t('noDeposit')}
              </p>
              {place && (
                <p className="mt-auto flex items-center gap-1.5 pt-1 text-sm">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 shrink-0">
                    <path
                      d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                    />
                    <circle cx="12" cy="10" r="2.25" fill="none" stroke="currentColor" strokeWidth="1.75" />
                  </svg>
                  <span className="[overflow-wrap:anywhere]">{place}</span>
                </p>
              )}
            </>
          )}
        </div>
      </article>
      <HeartButton listingId={item.id} title={item.title} className="absolute top-3 right-3 z-10" />
    </div>
  );
}
