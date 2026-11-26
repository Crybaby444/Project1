import type { QuoteView } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { formatDay } from '@/lib/deals/dates';
import { useMoney } from '@/lib/deals/money';

/**
 * The service fee row of a price: "Service fee (10%) · €4.50", or in a new account's first month
 * "Service fee · 0 € · [No fee until 5 Feb 2027]" (owner, 2026-11-26). The percent and the offer come from the quote, frozen into a booking when it is requested.
 */
export function FeeLine({ quote }: { quote: Pick<QuoteView, 'servicePercent' | 'serviceFeeCents' | 'servicePromoUntil'> }) {
  const t = useTranslations('booking.summary');
  const locale = useLocale();
  const money = useMoney();
  const promo = quote.servicePromoUntil;
  const date = promo ? formatDay(promo, locale) : '';
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3">
      <dt className="flex flex-col items-start gap-1">
        {promo ? t('feeName') : t('fee', { percent: quote.servicePercent })}
        {promo && (
          <span
            data-fee-promo=""
            title={t('feePromoLabel', { percent: quote.servicePercent, date })}
            className="rounded-pill bg-ink text-canvas inline-flex min-h-6 items-center border border-ink/15 px-2.5 text-xs font-bold"
          >
            <span aria-hidden="true">{t('feePromo', { percent: quote.servicePercent, date })}</span>
            <span className="sr-only">{t('feePromoLabel', { percent: quote.servicePercent, date })}</span>
          </span>
        )}
      </dt>
      <dd className="col-start-2 row-start-1 font-bold tabular-nums">{money(quote.serviceFeeCents)}</dd>
    </div>
  );
}
