import type { QuoteView } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { formatDay } from '@/lib/deals/dates';
import { useMoney } from '@/lib/deals/money';

/**
 * The service fee row of a price: "Service fee (10%) · €4.50", or during the launch offer
 * "Service fee · 0 € · [0% fee until 5 Feb 2027]" with a Sunburst sticker (owner decision of
 * 2026-11-06). The percent and the offer come from the quote, frozen into a booking when it is requested.
 */
export function FeeLine({ quote }: { quote: Pick<QuoteView, 'servicePercent' | 'serviceFeeCents' | 'servicePromoUntil'> }) {
  const t = useTranslations('booking.summary');
  const locale = useLocale();
  const money = useMoney();
  const promo = quote.servicePromoUntil;
  const date = promo ? formatDay(promo, locale) : '';
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <dt className="flex flex-wrap items-center gap-2">
        {promo ? t('feeName') : t('fee', { percent: quote.servicePercent })}
        {promo && (
          <span
            data-fee-promo=""
            title={t('feePromoLabel', { percent: quote.servicePercent, date })}
            className="rounded-pill bg-ink text-canvas inline-flex min-h-6 items-center border border-ink/15 px-2.5 text-[12px] font-bold"
          >
            <span aria-hidden="true">{t('feePromo', { percent: quote.servicePercent, date })}</span>
            <span className="sr-only">{t('feePromoLabel', { percent: quote.servicePercent, date })}</span>
          </span>
        )}
      </dt>
      <dd className="font-bold tabular-nums">{money(quote.serviceFeeCents)}</dd>
    </div>
  );
}
