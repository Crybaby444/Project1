'use client';

import type { PublicReview } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { Stars } from './Stars';

/** Reviews as a list of hairline rows: who and from which side, when, the stars, the words. */
export function ReviewList({ reviews, showItem = false }: { reviews: PublicReview[]; showItem?: boolean }) {
  const t = useTranslations('reviews');
  const locale = useLocale();
  const date = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  return (
    <ul className="border-ink/15 m-0 list-none border-t p-0">
      {reviews.map((review) => (
        <li key={review.id} className="border-ink/15 flex flex-col gap-2.5 border-b py-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="m-0">
              <span className="font-display text-[1.35rem] leading-none font-black uppercase">{review.author.name}</span>{' '}
              <span className="text-ink/75 text-sm">· {showItem ? t(`roleItem.${review.authorRole}`) : t(`role.${review.authorRole}`)}</span>
            </p>
            <time dateTime={review.createdAt} className="text-ink/75 text-sm tabular-nums">
              {date.format(new Date(review.createdAt))}
            </time>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <Stars value={review.rating} />
            {showItem && review.itemRating !== null ? (
              <span className="text-ink/75 inline-flex items-center gap-2 text-sm">
                {t('itemStars')} <Stars value={review.itemRating} size={12} />
              </span>
            ) : null}
          </div>
          <p className="m-0 max-w-[68ch] leading-relaxed whitespace-pre-line [overflow-wrap:anywhere]">{review.text}</p>
        </li>
      ))}
    </ul>
  );
}
