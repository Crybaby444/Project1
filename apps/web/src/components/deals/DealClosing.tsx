'use client';

import type { BookingView } from '@yoyo/shared';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { useDealReviews } from '@/components/reviews/DealReviewsPanel';
import { useMoney } from '@/lib/deals/money';
import { depositState } from './DealSummary';

/**
 * A completed deal's moment (DESIGN.md "Surfaces", owner 2026-11-26: make the path positive): the brand's
 * promise kept, "It all came back", what the money did for this side (the renter's deposit back, the
 * owner's rent in the wallet), and the one thing still to do, the review, then the next deal.
 */
export function DealClosing({ booking }: { booking: BookingView }) {
  const t = useTranslations('deal.closing');
  const money = useMoney();
  const reviews = useDealReviews(booking.id);
  const asOwner = booking.viewerRole === 'OWNER';
  const deposit = depositState(booking);
  const line = asOwner
    ? t('owner', { amount: money(booking.quote.ownerPayoutCents) })
    : deposit === 'refunded'
      ? t('renterRefunded', { amount: money(booking.quote.depositCents) })
      : deposit === 'toOwner'
        ? t('renterToOwner', { amount: money(booking.quote.depositCents) })
        : t('renterNone');
  const canReview = reviews.data?.canReview ?? false;
  const reviewed = Boolean(reviews.data?.mine);

  return (
    <Sheet tone="night" aria-labelledby="deal-closing" className="flex flex-col gap-4 max-lg:order-first" data-deal-closing="">
      <h2 id="deal-closing" className="type-block">
        {t('title')}
      </h2>
      <p className="leading-relaxed text-[var(--paper)]/85">{line}</p>
      {reviewed && !canReview && <p className="text-sm font-bold">{t('reviewed')}</p>}
      <div className="flex flex-wrap gap-2.5">
        {canReview && <Button href="#deal-reviews">{t('review')}</Button>}
        <Button variant="ghost" href={asOwner ? '/listings/new' : '/c'}>
          {asOwner ? t('moreOwner') : t('moreRenter')}
        </Button>
      </div>
    </Sheet>
  );
}
