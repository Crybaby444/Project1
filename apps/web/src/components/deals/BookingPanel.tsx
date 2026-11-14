'use client';

import { cents, DomainError, quote as priceDays, type LocalDate } from '@yoyo/domain';
import { BOOKING_LIMITS, type BookingTerms, type QuoteView } from '@yoyo/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useId, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { TEXTAREA_CLASS } from '@/components/ui/inputs';
import { useToast } from '@/components/ui/Toast';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useErrorText } from '@/lib/forms/error-text';
import { daysBetween, formatPeriod } from '@/lib/deals/dates';
import { useIdempotentMutation } from '@/lib/deals/idempotency';
import { dealKeys, useBookingTerms } from '@/lib/deals/queries';
import { addDays } from '@/lib/listings/calendar';
import { ApiError, unwrap } from '@/lib/session/api-error';
import { useApiClient, useSession } from '@/lib/session/SessionProvider';
import { useLocale } from 'next-intl';
import { crossesTaken, DateRangePicker, type Range } from './DateRangePicker';
import { PriceSummary } from './PriceSummary';

type Problem = 'tooShort' | 'tooLong' | 'crossesTaken' | null;

/**
 * The price of a picked range with the domain's own `quote` (the same rules the API uses), or why the
 * range does not work. The API's answer to the request is the final word.
 */
export function priceRange(terms: BookingTerms, range: Range | null): { quote: QuoteView | null; problem: Problem } {
  if (!range?.end) return { quote: null, problem: null };
  if (crossesTaken(terms.blocked, range.start, range.end)) return { quote: null, problem: 'crossesTaken' };
  const days = daysBetween(range.start, range.end);
  try {
    const q = priceDays({
      pricing: { ...terms.pricing, dailyCents: cents(terms.pricing.dailyCents), depositCents: cents(terms.pricing.depositCents) },
      days,
      servicePercent: terms.servicePercent,
      servicePromoUntil: terms.servicePromoUntil as LocalDate | null,
    });
    return { quote: { ...q }, problem: null };
  } catch (error) {
    if (error instanceof DomainError && error.code === 'PERIOD_TOO_SHORT') return { quote: null, problem: 'tooShort' };
    if (error instanceof DomainError && error.code === 'PERIOD_TOO_LONG') return { quote: null, problem: 'tooLong' };
    throw error;
  }
}

/**
 * Booking an item (spec §4.4 step 1): pick the days, see the price from the domain rules, add a note,
 * send the request. Self-contained: it loads the item's booking terms itself, so the item page of the
 * catalog (plan 7) can place it in its own column. Sending needs a session; a visitor is sent to sign in
 * and comes back here. The request carries an Idempotency-Key, so a double click sends one request.
 */
export function BookingPanel({ listingId, layout = 'wide' }: { listingId: string; layout?: 'wide' | 'stacked' }) {
  const t = useTranslations('booking');
  const locale = useLocale();
  const errorText = useErrorText();
  const client = useApiClient();
  const { status, user } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const queryClient = useQueryClient();
  const terms = useBookingTerms(listingId);
  const [range, setRange] = useState<Range | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Once the request is in, the button stays busy until the deal page opens: nothing to send twice.
  const [sent, setSent] = useState(false);
  const hintId = useId();

  const priced = useMemo(() => (terms.data ? priceRange(terms.data, range) : { quote: null, problem: null }), [terms.data, range]);

  const send = useIdempotentMutation<{ start: string; end: string; message: string }, string>({
    intent: (vars) => JSON.stringify(vars),
    mutate: async (vars, key) => {
      const { booking } = await unwrap(
        client.POST('/api/v1/bookings', {
          params: { header: { 'Idempotency-Key': key } },
          body: { listingId, start: vars.start, end: vars.end, ...(vars.message.trim() && { message: vars.message.trim() }) },
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
      const id = await send.run({ start: range.start, end: range.end, message });
      setSent(true);
      toast.show(t('sent'));
      router.push(`/bookings/${id}`);
    } catch (failure) {
      if (failure instanceof ApiError && failure.code === 'DATES_UNAVAILABLE') {
        setRange(null);
        await terms.refetch();
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
      <div role="alert" className="border-ink/15 bg-surface rounded-media flex flex-col items-start gap-3 border p-6">
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
    <div className={`grid gap-6 ${layout === 'wide' ? 'lg:grid-cols-[minmax(0,1fr)_22rem]' : ''}`} data-booking-panel="">
      <section aria-labelledby="booking-dates" className="border-ink/15 flex flex-col gap-4 border-t pt-6">
        <div className="flex flex-col gap-1">
          <h2 id="booking-dates" className="font-display text-[clamp(1.9rem,3.2vw,2.8rem)] leading-[0.95] font-black uppercase">
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
      </section>

      <aside className={`border-ink flex flex-col gap-5 self-start border-t-2 pt-6 ${layout === 'wide' ? 'lg:sticky lg:top-24' : ''}`}>
        <PriceSummary quote={priced.quote} />
        {own ? (
          <p className="bg-mist rounded-media p-4 text-sm font-bold">{t('own')}</p>
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
            {status === 'authenticated' ? (
              <Button size="lg" onClick={() => void submit()} loading={send.pending || sent} disabled={priced.quote === null}>
                {t('send')}
              </Button>
            ) : (
              <Button size="lg" href={`/login?next=${encodeURIComponent(pathname)}`}>
                {t('signIn')}
              </Button>
            )}
            <p className="text-sm">{t('noCharge')}</p>
          </>
        )}
      </aside>
    </div>
  );
}
