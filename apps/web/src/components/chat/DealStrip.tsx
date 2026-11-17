'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { DealActions } from '@/components/deals/DealActions';
import { DealStatusBadge } from '@/components/deals/DealStatusBadge';
import { Link } from '@/i18n/navigation';
import { formatPeriod } from '@/lib/deals/dates';
import { useDeal } from '@/lib/deals/queries';
import { isMyTurn } from '@/lib/deals/status';
import { useErrorText } from '@/lib/forms/error-text';

/**
 * The deal inside its conversation: status, days, whose turn, and the next step's buttons right here —
 * sign, pay, hand over — without leaving the chat. The whole deal is one tap away.
 */
export function DealStrip({ id }: { id: string }) {
  const t = useTranslations('deal');
  const tc = useTranslations('chat');
  const locale = useLocale();
  const errorText = useErrorText();
  const deal = useDeal(id);
  const [error, setError] = useState<string | null>(null);
  if (!deal.data) return null;
  const b = deal.data;
  const myTurn = isMyTurn(b.actions);
  const closed = ['COMPLETED', 'DECLINED', 'EXPIRED', 'CANCELLED'].includes(b.status);

  return (
    <section aria-label={tc('openDeal')} data-deal-strip="" className="border-ink/15 bg-ink/[0.03] flex flex-col gap-3 border-b px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
        <DealStatusBadge status={b.status} />
        {!closed && (
          <span className={`rounded-pill inline-flex min-h-7 items-center border px-3 text-sm font-bold ${myTurn ? 'bg-ink text-canvas border-ink' : 'border-ink/40'}`}>
            {myTurn ? t('yourTurn') : t('theirTurn')}
          </span>
        )}
        <span className="font-semibold">{formatPeriod(b.period.start, b.period.end, locale)}</span>
        <Link href={`/bookings/${b.id}`} className="ml-auto font-bold underline decoration-1 underline-offset-4">
          {tc('openDeal')}
        </Link>
      </div>
      {myTurn && !closed && (
        <div className="[&_[data-deal-actions]_button]:min-h-10">
          <DealActions booking={b} onError={(e) => setError(errorText(e))} />
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm font-bold">
          {error}
        </p>
      )}
    </section>
  );
}
