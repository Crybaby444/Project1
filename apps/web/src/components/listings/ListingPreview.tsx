'use client';

import type { PhotoUrls } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import type { ListingValues } from '@/lib/listings/listing-checks';
import { formatEuros } from '@/lib/listings/money';

type PreviewProps = {
  values: ListingValues;
  cover: PhotoUrls | null;
  /** "Electronics · Game consoles", or null before a category is chosen. */
  categoryName: string | null;
  /** The sticker colour of the category's pill. */
};

/**
 * The listing as its card will look in the catalog (plan 7): cover, title, category, condition,
 * price, deposit and the city with the district. Never the exact point: the props carry it (they
 * are the builder's values), so this component must not read lat or lng.
 */
export function ListingPreview({ values, cover, categoryName }: PreviewProps) {
  const t = useTranslations('builder.preview');
  const tCondition = useTranslations('listingCondition');
  const locale = useLocale();
  const price = values.dailyCents !== null && Number.isFinite(values.dailyCents) ? values.dailyCents : null;
  const place = [values.city.trim(), values.district.trim()].filter(Boolean).join(', ');
  const placeholder = 'text-ink/70';

  return (
    <div className="flex flex-col gap-3" aria-label={t('label')} role="figure">
      <div className="border-ink/15 bg-mist rounded-media relative aspect-[4/3] overflow-hidden border">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- photos come from the API's storage, already sized
          <img
            src={cover.card}
            alt=""
            className="ease-yoyo size-full object-cover transition-transform duration-450 hover:scale-[1.04]"
          />
        ) : (
          <div className="grid size-full place-items-center p-6 text-center text-sm">
            <span className={placeholder}>{t('noPhoto')}</span>
          </div>
        )}
        {values.weeklyDiscountPercent > 0 && Number.isFinite(values.weeklyDiscountPercent) && (
          <span className="bg-ink text-canvas rounded-pill absolute top-3 left-3 border border-ink/15 px-2.5 py-0.5 text-xs font-bold">
            {t('weekly', { percent: values.weeklyDiscountPercent })}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
          {categoryName && (
            <span
              className="rounded-pill border-ink/15 border px-2.5 py-0.5"
            >
              {categoryName}
            </span>
          )}
          {values.condition && (
            <span className="border-ink/15 rounded-pill border px-2.5 py-0.5">
              {tCondition(values.condition)}
            </span>
          )}
        </div>
        <p
          className={`text-base leading-snug font-bold [overflow-wrap:anywhere] ${values.title.trim() ? '' : placeholder}`}
        >
          {values.title.trim() || t('noTitle')}
        </p>
        <p className="font-display text-[1.7rem] leading-[0.9] font-black uppercase tabular-nums">
          {price !== null ? (
            t('perDay', { price: formatEuros(price, locale) })
          ) : (
            <span className={`${placeholder} font-sans text-base font-bold normal-case`}>{t('noPrice')}</span>
          )}
        </p>
        <p className="text-sm">
          {values.depositCents > 0 && Number.isFinite(values.depositCents)
            ? t('deposit', { amount: formatEuros(values.depositCents, locale) })
            : t('noDeposit')}
        </p>
        <p className="flex items-center gap-1.5 text-sm">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 shrink-0">
            <path
              d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
            />
            <circle cx="12" cy="10" r="2.25" fill="none" stroke="currentColor" strokeWidth="1.75" />
          </svg>
          {place ? (
            <span className="[overflow-wrap:anywhere]">{place}</span>
          ) : (
            <span className={placeholder}>{t('noPlace')}</span>
          )}
        </p>
      </div>
    </div>
  );
}
