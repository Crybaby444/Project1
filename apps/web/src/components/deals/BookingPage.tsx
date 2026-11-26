'use client';

import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/ui/PageHeader';
import { useBookingTerms } from '@/lib/deals/queries';
import { useMoney } from '@/lib/deals/money';
import { BookingPanel } from './BookingPanel';

/** The item at a glance (photo, title, owner, place, price a day) above the booking panel. */
export function BookingPage({ listingId }: { listingId: string }) {
  const t = useTranslations('booking');
  const money = useMoney();
  const terms = useBookingTerms(listingId);
  const listing = terms.data?.listing;
  const title = listing ? t('title', { item: listing.title }) : t('pageTitle');

  return (
    <main className="page page-y stack-page">
      <PageHeader
        title={title}
        media={
          <div className="border-ink/15 bg-mist rounded-media size-24 overflow-hidden border sm:size-28">
            {listing?.coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- photos come from the API's storage, already sized
              <img src={listing.coverUrl} alt="" width={224} height={224} className="size-full object-cover" />
            )}
          </div>
        }
        meta={
          listing &&
          terms.data && (
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-base">
              <span>{t('from', { name: listing.ownerName })}</span>
              {listing.city && <span>{listing.district ? t('where', { district: listing.district, city: listing.city }) : listing.city}</span>}
              <span className="font-bold">{t('perDay', { price: money(terms.data.pricing.dailyCents) })}</span>
            </p>
          )
        }
      />
      <BookingPanel listingId={listingId} />
    </main>
  );
}
