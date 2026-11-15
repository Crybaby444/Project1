'use client';

import type { OwnerListingSummary } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { Link } from '@/i18n/navigation';
import { BookingLinkButton } from '@/components/deals/BookingLinkButton';
import { formatEuros } from '@/lib/listings/money';
import { ListingActions, type ListingAction } from './ListingActions';
import { ListingStatusBadge } from './ListingStatusBadge';

/** One row of "My items": cover, title, state, price, and what can be done with it. */
export function MyListingCard({
  listing,
  perform,
}: {
  listing: OwnerListingSummary;
  perform(action: ListingAction): Promise<void>;
}) {
  const t = useTranslations('myListings');
  const locale = useLocale();
  const changed = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(listing.updatedAt),
  );
  const archived = listing.status === 'ARCHIVED';

  return (
    <div className="border-ink/15 rounded-media border h-full">
      <article className="flex h-full flex-col gap-4 p-4">
        <div className="border-ink/15 bg-mist rounded-media relative aspect-[4/3] overflow-hidden border">
          {listing.cover ? (
            // eslint-disable-next-line @next/next/no-img-element -- sized by the API's storage
            <img
              src={listing.cover.card}
              alt=""
              className="ease-yoyo size-full object-cover transition-transform duration-450 hover:scale-[1.04]"
            />
          ) : (
            <div className="text-ink/70 grid size-full place-items-center text-sm font-bold">{t('noPhoto')}</div>
          )}
          <ListingStatusBadge status={listing.status} className="absolute top-3 left-3" />
        </div>
        <div className="flex flex-1 flex-col gap-1.5 px-1">
          <h2 className="text-lg leading-snug font-bold [overflow-wrap:anywhere]">
            {listing.title ?? t('untitled')}
          </h2>
          <p className="font-bold">
            {listing.dailyCents !== null
              ? t('perDay', { price: formatEuros(listing.dailyCents, locale) })
              : t('noPrice')}
          </p>
          {listing.status === 'PUBLISHED' && <Activity activity={listing.activity} />}
          <p className="text-ink/75 text-sm">{t('changed', { date: changed })}</p>
          {listing.status === 'REJECTED' && listing.rejectionReason && (
            <div className="mt-2 flex flex-col gap-1">
              <p className="text-[13px] font-bold tracking-[0.03em] uppercase">{t('reason')}</p>
              <p className="border-[var(--danger)] border-l-4 pl-3 text-sm font-bold [overflow-wrap:anywhere]">
                {listing.rejectionReason}
              </p>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2 px-1">
          {listing.status === 'REJECTED' ? (
            <Button href={`/listings/${listing.id}/edit?step=basics`}>{t('fix')}</Button>
          ) : (
            <Button href={`/listings/${listing.id}/edit`} variant={archived ? 'ghost' : 'primary'}>
              {archived ? t('view') : t('edit')}
            </Button>
          )}
          {listing.status === 'PUBLISHED' && <BookingLinkButton listingId={listing.id} />}
          <ListingActions listing={listing} perform={perform} />
        </div>
      </article>
    </div>
  );
}

/** A published item's pulse: requests waiting (a way to answer them), the next paid rental, what it earned. */
function Activity({ activity }: { activity: OwnerListingSummary['activity'] }) {
  const t = useTranslations('myListings.activity');
  const locale = useLocale();
  const day = (d: string) => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${d}T00:00:00Z`));
  return (
    <ul className="my-1 flex flex-wrap gap-1.5 text-[13px] font-semibold">
      {activity.requests > 0 && (
        <li>
          <Link href="/bookings?role=owner" className="bg-ink text-canvas rounded-pill inline-flex min-h-7 items-center gap-1.5 px-2.5 before:size-1.5 before:rounded-full before:bg-current before:content-['']">
            {t('requests', { count: activity.requests })}
          </Link>
        </li>
      )}
      {activity.nextStart && <li className="border-ink/25 rounded-pill inline-flex min-h-7 items-center border px-2.5">{t('next', { date: day(activity.nextStart) })}</li>}
      {activity.earnedCents > 0 && (
        <li className="border-ink/25 rounded-pill inline-flex min-h-7 items-center border px-2.5">{t('earned', { amount: formatEuros(activity.earnedCents, locale) })}</li>
      )}
    </ul>
  );
}
