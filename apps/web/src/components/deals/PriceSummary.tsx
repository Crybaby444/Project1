'use client';

import type { QuoteView } from '@yoyo/shared';
import { useTranslations } from 'next-intl';
import { useMoney } from '@/lib/deals/money';
import { FeeLine } from './FeeLine';

/**
 * What a rental costs, line by line (the domain's `quote`): days × price, the weekly discount, the
 * service fee (with the launch-offer badge while it lasts), the deposit and the total. Rows that do not
 * apply are left out, but the block keeps its height, so picking days never pushes the page around.
 */
export function PriceSummary({ quote, title }: { quote: QuoteView | null; title?: string }) {
  const t = useTranslations('booking.summary');
  const money = useMoney();

  return (
    <section aria-labelledby="price-summary" className="flex flex-col gap-3" data-price-summary="">
      <h3 id="price-summary" className="text-[13px] font-bold tracking-[0.03em] uppercase">
        {title ?? t('title')}
      </h3>
      {quote === null ? (
        <p className="border-ink/40 rounded-card flex min-h-44 items-center justify-center border border-dashed p-4 text-center text-sm">
          {t('empty')}
        </p>
      ) : (
        <dl aria-live="polite" className="flex min-h-44 flex-col gap-2 text-[15px]">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <dt>
              {quote.priceSource === 'AGREED'
                ? t('agreed')
                : t('days', { price: money(quote.dailyCents), days: quote.days })}
            </dt>
            <dd className="font-bold tabular-nums">{money(quote.baseCents)}</dd>
          </div>
          {quote.discountCents > 0 && (
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <dt>{t('discount', { percent: quote.discountPercent })}</dt>
              <dd className="font-bold tabular-nums">{money(-quote.discountCents)}</dd>
            </div>
          )}
          <FeeLine quote={quote} />
          {quote.depositCents > 0 && (
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <dt className="flex items-center gap-2">
                <span aria-hidden="true" className="bg-sticker-lavender inline-block size-3 rounded-full border border-black" />
                {t('deposit')}
              </dt>
              <dd className="font-bold tabular-nums">{money(quote.depositCents)}</dd>
            </div>
          )}
          <div className="border-ink mt-1 flex flex-wrap items-baseline justify-between gap-x-3 border-t pt-3">
            <dt className="font-bold">{t('total')}</dt>
            <dd className="text-2xl font-bold tabular-nums" data-total="">
              {money(quote.totalCents)}
            </dd>
          </div>
          {quote.depositCents > 0 && <p className="text-sm">{t('depositNote')}</p>}
        </dl>
      )}
    </section>
  );
}
