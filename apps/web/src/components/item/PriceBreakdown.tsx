'use client';

import { formatMoney, type Quote } from '@yoyo/domain';
import type { Locale } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';

/**
 * What the chosen days cost, line by line, every amount from the domain's quote and written by its
 * formatMoney (the same numbers the API will charge): days × price, the weekly discount, the rent,
 * Yoyo's fee, the deposit that comes back, and the total.
 */
export function PriceBreakdown({ quote, servicePercent }: { quote: Quote; servicePercent: number }) {
  const t = useTranslations('item.price');
  const locale = useLocale() as Locale;
  const money = (amount: Quote['totalCents']) => formatMoney(amount, locale);

  const rows: { label: string; amount: string; strong?: boolean; minus?: boolean }[] = [
    { label: t('days', { price: money(quote.dailyCents), days: quote.days }), amount: money(quote.baseCents) },
    ...(quote.discountCents > 0
      ? [{ label: t('discount', { percent: quote.discountPercent }), amount: `−${money(quote.discountCents)}`, minus: true }]
      : []),
    { label: t('rent'), amount: money(quote.rentCents) },
    { label: t('fee', { percent: servicePercent }), amount: money(quote.serviceFeeCents) },
    { label: t('deposit'), amount: money(quote.depositCents) },
  ];

  return (
    <div className="flex flex-col gap-3" aria-live="polite">
      <dl className="flex flex-col gap-2 text-[15px]">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-3">
            <dt className="min-w-0 [overflow-wrap:anywhere]">{row.label}</dt>
            <dd className={`shrink-0 tabular-nums ${row.minus ? 'font-bold' : ''}`}>{row.amount}</dd>
          </div>
        ))}
        <div className="border-ink flex items-baseline justify-between gap-3 border-t pt-3 text-lg font-bold">
          <dt>{t('total')}</dt>
          <dd className="tabular-nums">{money(quote.totalCents)}</dd>
        </div>
      </dl>
      {quote.depositCents > 0 && <p className="text-sm">{t('depositNote', { amount: money(quote.depositCents) })}</p>}
    </div>
  );
}
