'use client';

import { useTranslations } from 'next-intl';
import { displayFit } from '@/lib/display-fit';
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
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 py-10 sm:px-8 sm:py-14">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="border-ink/15 bg-mist rounded-media size-24 shrink-0 overflow-hidden border sm:size-28">
          {listing?.coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- photos come from the API's storage, already sized
            <img src={listing.coverUrl} alt="" width={224} height={224} className="size-full object-cover" />
          )}
        </div>
        <div className="@container flex min-w-0 flex-1 flex-col gap-2">
          <h1 style={displayFit(title, { max: '3rem' })} className="font-display text-display-fit leading-[0.9] font-black uppercase [overflow-wrap:anywhere]">
            {title}
          </h1>
          {listing && terms.data && (
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-[15px]">
              <span>{t('from', { name: listing.ownerName })}</span>
              {listing.city && <span>{listing.district ? t('where', { district: listing.district, city: listing.city }) : listing.city}</span>}
              <span className="font-bold">{t('perDay', { price: money(terms.data.pricing.dailyCents) })}</span>
            </p>
          )}
        </div>
      </header>
      <BookingPanel listingId={listingId} />
    </main>
  );
}
