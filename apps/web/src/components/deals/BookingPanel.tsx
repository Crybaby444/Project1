'use client';

import { BOOKING_LIMITS, type OfferView } from '@yoyo/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useLocale, useNow, useTranslations } from 'next-intl';
import { useId, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { TEXTAREA_CLASS } from '@/components/ui/inputs';
import { useToast } from '@/components/ui/Toast';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { useErrorText } from '@/lib/forms/error-text';
import { daysBetween, formatPeriod } from '@/lib/deals/dates';
import { useIdempotentMutation } from '@/lib/deals/idempotency';
import { offerForItem, useMyOffers } from '@/lib/deals/offers';
import { priceRange } from '@/lib/deals/price';
import { dealKeys, useBookingTerms } from '@/lib/deals/queries';
import { addDays } from '@/lib/listings/calendar';
import { centsToInput } from '@/lib/listings/money';
import { ApiError, unwrap } from '@/lib/session/api-error';
import { useApiClient, useSession } from '@/lib/session/SessionProvider';
import { IdentityNotice, useDealReadiness } from '@/components/identity/IdentityNotice';
import { useIdentityState } from '@/lib/identity/queries';
import { DateRangePicker, type Range } from './DateRangePicker';
import { AgreedNotice, checkOffer, OfferForm, OfferStatus, suggestedOffer, takesOffers } from './OfferBox';
import { OffersBlock } from './Offers';
import { PriceSummary } from './PriceSummary';

const sameDays = (range: Range | null, offer: OfferView | null) =>
  offer !== null && range?.start === offer.start && range.end === offer.end;

/**
 * Booking an item (spec §4.4 step 1): pick the days, see the price from the domain rules, add a note,
 * send the request. Self-contained: it loads the item's booking terms itself, so the item page of the
 * catalog (plan 7) can place it in its own column. Sending needs a session; a visitor is sent to sign in
 * and comes back here. The request carries an Idempotency-Key, so a double click sends one request.
 */
export function BookingPanel({
  listingId,
  layout = 'wide',
  similarPath,
}: {
  listingId: string;
  layout?: 'wide' | 'stacked';
  /** The item's category page: picked days that cross taken ones lead to similar items free on them. */
  similarPath?: string;
}) {
  const t = useTranslations('booking');
  const locale = useLocale();
  const errorText = useErrorText();
  const client = useApiClient();
  const { status, user } = useSession();
  const readiness = useDealReadiness();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const queryClient = useQueryClient();
  const terms = useBookingTerms(listingId);
  // The days a search asked for (`?from=&to=` on the item's address) are picked already when they work for
  // this item (owner, 2026-11-26: a positive path; no picking the same days twice). `undefined` = untouched,
  // so the asked days show; anything picked or cleared by hand wins.
  const [picked, setRange] = useState<Range | null | undefined>(undefined);
  const [asked] = useState<Range | null>(() => {
    if (typeof window === 'undefined') return null;
    const query = new URLSearchParams(window.location.search);
    const from = query.get('from');
    const to = query.get('to');
    return from && to && /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to) && from <= to ? ({ start: from, end: to } as Range) : null;
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Once the request is in, the button stays busy until the deal page opens: nothing to send twice.
  const [sent, setSent] = useState(false);
  // The offer being written (its text), or null while booking at the listed price.
  const [draft, setDraft] = useState<string | null>(null);
  // The API asked for a confirmed identity for days of this value (audit D4): the panel says how, in place of
  // the button, until other days are picked.
  const [expensive, setExpensive] = useState(false);
  const identity = useIdentityState(expensive);
  const hintId = useId();
  const now = useNow({ updateInterval: 60_000 });

  const joined = user?.createdAt ?? null;
  const offers = useMyOffers('renter', status === 'authenticated');
  const offer = terms.data ? offerForItem(offers.data, listingId, terms.data.today, now.getTime()) : null;
  // An accepted offer prices exactly its own days: they come picked, like the days a search asked for.
  const agreed = offer?.status === 'ACCEPTED' ? offer : null;
  const askedWorks =
    asked !== null &&
    terms.data !== undefined &&
    asked.start >= terms.data.today &&
    asked.end! <= addDays(terms.data.today, terms.data.maxAdvanceDays) &&
    priceRange(terms.data, asked, joined).problem === null;
  const range = useMemo(
    () => (picked !== undefined ? picked : agreed ? { start: agreed.start, end: agreed.end } : askedWorks ? asked : null),
    [picked, agreed, askedWorks, asked],
  );
  const agreedApplies = agreed !== null && sameDays(range, agreed);
  const priced = useMemo(
    () =>
      terms.data
        ? priceRange(terms.data, range, joined, agreedApplies ? agreed.dailyCents : undefined)
        : { quote: null, problem: null },
    [terms.data, range, joined, agreedApplies, agreed],
  );
  const offerCheck = draft !== null && terms.data && range?.end ? checkOffer(terms.data, range, joined, draft) : null;

  const send = useIdempotentMutation<{ start: string; end: string; message: string; offerId: string | null }, string>({
    intent: (vars) => JSON.stringify(vars),
    mutate: async (vars, key) => {
      const { booking } = await unwrap(
        client.POST('/api/v1/bookings', {
          params: { header: { 'Idempotency-Key': key } },
          body: {
            listingId,
            start: vars.start,
            end: vars.end,
            ...(vars.offerId && { offerId: vars.offerId }),
            ...(vars.message.trim() && { message: vars.message.trim() }),
          },
        }),
      );
      queryClient.setQueryData(dealKeys.one(booking.id), booking);
      await queryClient.invalidateQueries({ queryKey: dealKeys.all });
      return booking.id;
    },
  });

  async function submit() {
    if (sent || !range?.end || priced.quote === null) return;
    setError(null);
    try {
      const id = await send.run({ start: range.start, end: range.end, message, offerId: agreedApplies ? agreed.id : null });
      setSent(true);
      toast.show(t('sent'));
      router.push(`/bookings/${id}`);
    } catch (failure) {
      if (failure instanceof ApiError && failure.code === 'DATES_UNAVAILABLE') {
        setRange(null);
        await terms.refetch();
      }
      if (failure instanceof ApiError && failure.code === 'OFFER_UNAVAILABLE') await offers.refetch();
      const missing = failure instanceof ApiError && failure.code === 'VERIFICATION_REQUIRED' ? failure.details?.['missing'] : undefined;
      if (Array.isArray(missing) && missing.includes('IDENTITY')) {
        setExpensive(true);
        return;
      }
      setError(errorText(failure));
    }
  }

  if (terms.isPending) {
    return <div aria-busy="true" className="rounded-media border-ink/20 bg-surface h-[36rem] animate-pulse border" />;
  }
  if (terms.isError) {
    const code = terms.error instanceof ApiError ? terms.error.code : null;
    return (
      <div role="alert" className="sheet border-ink/15 rounded-media flex flex-col items-start gap-3 border p-5 sm:p-6">
        <p className="text-lg font-bold">
          {code === 'NOT_FOUND' ? t('notFound') : code === 'LISTING_UNAVAILABLE' ? t('unavailable') : t('loadFailed')}
        </p>
        {code === 'NOT_FOUND' ? <p>{t('notFoundBody')}</p> : code !== 'LISTING_UNAVAILABLE' && (
          <Button variant="ghost" onClick={() => void terms.refetch()}>
            {t('retry')}
          </Button>
        )}
      </div>
    );
  }

  const data = terms.data;
  const own = user?.id === data.listing.ownerId;
  const lastDay = addDays(data.today, data.maxAdvanceDays);
  const problemText =
    priced.problem === 'tooShort'
      ? t('tooShort', { min: data.pricing.minDays })
      : priced.problem === 'tooLong'
        ? t('tooLong', { max: data.pricing.maxDays })
        : priced.problem === 'crossesTaken'
          ? t('crossesTaken')
          : null;

  return (
    // `stacked`: one column, for a side column such as the item page's (the calendar keeps its width).
    <div className={layout === 'wide' ? 'layout-split' : 'grid gap-6'} data-booking-panel="">
      <section aria-labelledby="booking-dates" className={`flex flex-col gap-4 ${layout === 'wide' ? 'sheet border-ink/15 rounded-media border p-5 sm:p-6' : 'border-ink/15 border-t pt-6'}`}>
        <div className="flex flex-col gap-1">
          <h2 id="booking-dates" className="type-block">
            {t('dates')}
          </h2>
          <p id={hintId} className="text-sm">
            {t('datesHint', { min: data.pricing.minDays, max: data.pricing.maxDays })}
            {data.pricing.weeklyDiscountPercent > 0 && ` ${t('weekly', { percent: data.pricing.weeklyDiscountPercent })}.`}
          </p>
        </div>
        <DateRangePicker
          today={data.today}
          lastDay={lastDay}
          blocked={data.blocked}
          range={range}
          onChange={(next) => {
            setError(null);
            setExpensive(false);
            setRange(next);
          }}
          describedBy={hintId}
          oneMonth={layout === 'stacked'}
        />
        <p role="status" data-range-status="" className="min-h-6 text-sm font-bold">
          {range?.end
            ? t('picked', { period: formatPeriod(range.start, range.end, locale), days: daysBetween(range.start, range.end) })
            : range
              ? t('pickEnd')
              : t('pickStart')}
        </p>
        {problemText && (
          <p role="alert" className="flex items-start gap-2 text-sm font-bold">
            <span aria-hidden="true" className="bg-[var(--danger)] mt-0.5 inline-block size-4 shrink-0 rounded-full border border-ink/15" />
            {problemText}
          </p>
        )}
        {/* Taken days in the way are not the end: the same kind of item, free on exactly these days. */}
        {priced.problem === 'crossesTaken' && similarPath && range?.end && (
          <Link
            href={`${similarPath}?from=${range.start}&to=${range.end}`}
            className="self-start text-sm font-bold underline decoration-1 underline-offset-4"
            data-similar-free=""
          >
            {t('similarFree')} →
          </Link>
        )}
      </section>

      <aside className={`flex flex-col gap-5 self-start ${layout === 'wide' ? 'sheet border-ink rounded-media border-2 p-5 sm:p-6 lg:sticky lg:top-24' : 'border-ink border-t-2 pt-6'}`}>
        {!own && agreed && (
          <AgreedNotice
            offer={agreed}
            applies={agreedApplies}
            onUseDays={() => {
              setError(null);
              setDraft(null);
              setRange({ start: agreed.start, end: agreed.end });
            }}
          />
        )}
        {/* While an offer is written, the price block shows the days at that price: what the owner would agree to. */}
        <PriceSummary quote={offerCheck?.quote ?? priced.quote} title={offerCheck?.quote ? t('offer.summary') : undefined} />
        {own ? (
          <>
            <p className="bg-mist rounded-tile p-4 text-sm font-bold">{t('own')}</p>
            <OffersBlock role="owner" listingId={listingId} />
          </>
        ) : draft !== null && range?.end && offerCheck ? (
          <OfferForm
            listingId={listingId}
            terms={data}
            range={{ start: range.start, end: range.end }}
            text={draft}
            check={offerCheck}
            onText={setDraft}
            onBack={() => setDraft(null)}
            onSent={() => {
              setDraft(null);
              toast.show(t('offer.sent'));
            }}
          />
        ) : (
          <>
            <Field label={t('message')} hint={t('messageHint')}>
              <textarea
                value={message}
                maxLength={BOOKING_LIMITS.message}
                onChange={(event) => setMessage(event.target.value)}
                rows={3}
                className={`${TEXTAREA_CLASS} min-h-24`}
              />
            </Field>
            {error && (
              <p role="alert" className="flex items-start gap-2 text-sm font-bold">
                <span aria-hidden="true" className="bg-[var(--danger)] mt-0.5 inline-block size-4 shrink-0 rounded-full border border-ink/15" />
                {error}
              </p>
            )}
            {status === 'authenticated' && readiness !== 'ready' && readiness !== 'unknown' ? (
              <IdentityNotice action="rent" readiness={readiness} />
            ) : status === 'authenticated' && expensive ? (
              <IdentityNotice action="expensive" readiness={identity.data?.status === 'PENDING' ? 'pending' : 'identity'} />
            ) : status === 'authenticated' ? (
              <Button size="lg" onClick={() => void submit()} loading={send.pending || sent} disabled={priced.quote === null}>
                {agreedApplies ? t('sendAgreed') : t('send')}
              </Button>
            ) : (
              <Button size="lg" href={`/login?next=${encodeURIComponent(pathname)}`}>
                {t('signIn')}
              </Button>
            )}
            <p className="text-sm">{t('noCharge')}</p>
            {status === 'authenticated' && (readiness === 'ready' || readiness === 'unknown') && (
              <OfferStatus
                offer={agreed ? null : offer}
                canOffer={takesOffers(data.pricing.dailyCents) && priced.quote !== null && !agreedApplies}
                onOffer={(fromCents) => {
                  setError(null);
                  setDraft(centsToInput(fromCents ?? suggestedOffer(data.pricing.dailyCents), locale));
                }}
              />
            )}
          </>
        )}
      </aside>
    </div>
  );
}
