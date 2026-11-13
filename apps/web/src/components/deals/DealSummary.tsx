'use client';

import type { BookingView } from '@yoyo/shared';
import { useTranslations } from 'next-intl';
import { useMoney } from '@/lib/deals/money';
import { FeeLine } from './FeeLine';

type DepositState = 'none' | 'pending' | 'frozen' | 'refunded' | 'toOwner' | 'refundedAll';

/** Where the deposit is now, read from the deal (the ledger moved it by the same rules). */
export function depositState(booking: BookingView): DepositState {
  if (booking.quote.depositCents === 0) return 'none';
  if (booking.outcome === 'DEPOSIT_REFUNDED') return 'refunded';
  if (booking.outcome === 'DEPOSIT_TO_OWNER') return 'toOwner';
  if (booking.outcome === 'REFUNDED_ALL') return 'refundedAll';
  if (booking.paymentMethod) return 'frozen';
  return 'pending';
}

const DEPOSIT_FILL: Record<DepositState, string> = {
  none: 'bg-mist text-ink',
  pending: 'bg-surface text-ink',
  frozen: 'bg-mist text-ink',
  refunded: 'bg-ink text-canvas',
  toOwner: 'bg-[var(--danger)] text-black',
  refundedAll: 'bg-mist text-ink',
};

/** The deal's money: rent, fee (frozen when it was requested), deposit and where it is, the total. */
export function DealSummary({ booking }: { booking: BookingView }) {
  const t = useTranslations('deal.money');
  const money = useMoney();
  const q = booking.quote;
  const deposit = depositState(booking);

  return (
    <section aria-labelledby="deal-money" className="border-ink bg-surface rounded-media flex flex-col gap-3 border p-5 sm:p-6">
      <h2 id="deal-money" className="text-xl font-bold">
        {t('title')}
      </h2>
      <dl className="flex flex-col gap-2 text-[15px]">
        <div className="flex flex-wrap justify-between gap-x-3">
          <dt>{t('rent')}</dt>
          <dd className="font-bold tabular-nums">{money(q.rentCents)}</dd>
        </div>
        <FeeLine quote={q} />
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <dt className="flex flex-wrap items-center gap-2">
            {t('deposit')}
            <span data-deposit-state={deposit} className={`rounded-pill inline-flex min-h-6 items-center border border-ink/15 px-2.5 text-[12px] font-bold ${DEPOSIT_FILL[deposit]}`}>
              {t(`depositState.${deposit}`)}
            </span>
          </dt>
          <dd className="font-bold tabular-nums">{money(q.depositCents)}</dd>
        </div>
        <div className="border-ink flex flex-wrap items-baseline justify-between gap-x-3 border-t pt-2">
          <dt className="font-bold">{t('total')}</dt>
          <dd className="text-xl font-bold tabular-nums">{money(q.totalCents)}</dd>
        </div>
        {booking.viewerRole !== 'RENTER' && (
          <div className="flex flex-wrap justify-between gap-x-3 text-sm">
            <dt>{t('payout')}</dt>
            <dd className="font-bold tabular-nums">{money(q.ownerPayoutCents)}</dd>
          </div>
        )}
      </dl>
      {booking.paymentMethod && <p className="text-sm">{t('paidBy', { method: t(booking.paymentMethod) })}</p>}
    </section>
  );
}
