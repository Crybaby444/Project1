'use client';

import { BOOKING_LIMITS, type AvailableItem } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useId, useMemo, useRef, useState, type RefObject } from 'react';
import { RangeCalendar } from '@/components/catalog/RangeCalendar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { priceFor, type PriceProblem } from '@/lib/catalog/calculator';
import type { Range } from '@/lib/catalog/range';
import { addDays } from '@/lib/listings/calendar';
import { formatEuros } from '@/lib/listings/money';
import { useApiClient, useSession } from '@/lib/session/SessionProvider';
import { PriceBreakdown } from './PriceBreakdown';

type Sent = { status: 'idle' } | { status: 'sending' } | { status: 'sent' } | { status: 'failed'; message: string; atCalendar: boolean };

const PROBLEMS = new Set<string>(['START_IN_PAST', 'TOO_FAR_AHEAD', 'PERIOD_TOO_SHORT', 'PERIOD_TOO_LONG', 'DATES_UNAVAILABLE', 'INVALID_PERIOD']);

type ErrorBody = { error?: { code?: string; details?: { reason?: string } } } | undefined;

/**
 * The booking side of the item page (spec §4.2): the price, the availability calendar and what the
 * chosen days cost, computed in the browser by the domain rules (calculator.ts), then «Request
 * booking» (POST /bookings, which checks everything again). A visitor is sent to sign in and back;
 * the owner sees their own item without the button. On a phone a bar at the bottom of the screen
 * («from €15 a day · Choose dates») leads to it until the panel itself is in view.
 */
export function BookingPanel({ item }: { item: AvailableItem }) {
  const t = useTranslations('item.booking');
  const tErrors = useTranslations('errors');
  const locale = useLocale();
  const api = useApiClient();
  const { status, user } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const ids = { title: useId(), message: useId(), problem: useId() };
  const { listing, booking, blocked } = item;
  const [range, setRange] = useState<Range | null>(null);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState<Sent>({ status: 'idle' });
  const panel = useRef<HTMLElement>(null);
  const panelInView = useInView(panel);
  const own = user?.id === listing.ownerId;
  const daily = listing.dailyCents ?? 0;

  const result = useMemo(() => (range?.end ? priceFor(item, range.start, range.end) : null), [item, range]);

  function problemText(problem: PriceProblem): string {
    return t(`problems.${problem}`, {
      minDays: listing.minDays,
      maxDays: listing.maxDays,
      maxAdvanceDays: booking.maxAdvanceDays,
    });
  }

  function choose(next: Range) {
    setRange(next);
    if (sent.status === 'failed') setSent({ status: 'idle' });
  }

  async function request() {
    if (status !== 'authenticated') {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (!range?.end || !result?.ok) return;
    setSent({ status: 'sending' });
    const note = message.trim();
    try {
      const { response, error } = await api.POST('/api/v1/bookings', {
        body: { listingId: listing.id, start: range.start, end: range.end, ...(note ? { message: note } : {}) },
      });
      if (response.ok) {
        setSent({ status: 'sent' });
        return;
      }
      const body = error as ErrorBody;
      const code = body?.error?.code ?? 'INTERNAL';
      const reason = body?.error?.details?.reason;
      if (code === 'VALIDATION_FAILED' && reason && PROBLEMS.has(reason)) {
        setSent({ status: 'failed', message: problemText(reason as PriceProblem), atCalendar: true });
      } else {
        setSent({
          status: 'failed',
          message: tErrors.has(code) ? tErrors(code) : tErrors('INTERNAL'),
          atCalendar: code === 'DATES_UNAVAILABLE',
        });
      }
    } catch {
      setSent({ status: 'failed', message: tErrors('NETWORK'), atCalendar: false });
    }
  }

  const calendarProblem =
    sent.status === 'failed' && sent.atCalendar ? sent.message : result && !result.ok ? problemText(result.problem) : null;

  return (
    <>
      <section ref={panel} id="booking" aria-labelledby={ids.title} className="scroll-mt-24">
        <Card className="flex flex-col gap-5 p-5 sm:p-6">
          <div className="flex flex-col gap-1">
            <h2 id={ids.title} className="sr-only">
              {t('title')}
            </h2>
            <p className="text-3xl font-bold tabular-nums">{t('perDay', { price: formatEuros(daily, locale) })}</p>
            <ul className="flex flex-wrap gap-2 text-xs font-bold">
              {listing.weeklyDiscountPercent > 0 && (
                <li className="bg-sticker-sun rounded-pill -rotate-2 border border-black px-2.5 py-0.5 text-black">
                  {t('weekly', { percent: listing.weeklyDiscountPercent })}
                </li>
              )}
              <li className="border-ink rounded-pill border px-2.5 py-0.5">
                {listing.depositCents > 0 ? t('deposit', { amount: formatEuros(listing.depositCents, locale) }) : t('noDeposit')}
              </li>
              <li className="border-ink rounded-pill border px-2.5 py-0.5">
                {listing.minDays === listing.maxDays
                  ? t('exactDays', { days: listing.minDays })
                  : t('days', { min: listing.minDays, max: listing.maxDays })}
              </li>
            </ul>
          </div>

          {sent.status === 'sent' ? (
            <div role="status" className="bg-sticker-mint rounded-card animate-pop-in flex flex-col gap-2 border border-black p-4 text-black">
              <p className="text-lg font-bold">{t('sentTitle')}</p>
              <p>{t('sentBody')}</p>
            </div>
          ) : (
            <>
              <RangeCalendar
                value={range}
                onChange={choose}
                today={booking.today}
                lastDay={addDays(booking.today, booking.maxAdvanceDays)}
                blocked={blocked}
                twoMonths={false}
              />
              <p id={ids.problem} role={calendarProblem ? 'alert' : undefined} className="min-h-6 text-sm font-bold">
                {calendarProblem ?? (range?.end ? '' : t('pickDates'))}
              </p>

              {result?.ok && <PriceBreakdown quote={result.quote} servicePercent={booking.servicePercent} />}

              {own ? (
                <p className="border-ink rounded-card border border-dashed p-4 text-sm">
                  {t('own')}{' '}
                  <Link href={`/listings/${listing.id}/edit`} className="font-bold underline underline-offset-4">
                    {t('edit')}
                  </Link>
                </p>
              ) : (
                <>
                  {status === 'authenticated' && result?.ok && (
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor={ids.message} className="text-sm font-bold">
                        {t('message')}
                      </label>
                      <textarea
                        id={ids.message}
                        value={message}
                        maxLength={BOOKING_LIMITS.message}
                        onChange={(event) => setMessage(event.target.value)}
                        rows={3}
                        placeholder={t('messagePlaceholder')}
                        className="border-ink bg-surface rounded-card border px-4 py-3 text-base"
                      />
                    </div>
                  )}
                  <Button
                    size="lg"
                    onClick={() => void request()}
                    loading={sent.status === 'sending'}
                    disabled={status === 'authenticated' && !result?.ok}
                    aria-describedby={ids.problem}
                    className="w-full"
                  >
                    {status === 'authenticated' ? t('request') : t('signInToRequest')}
                  </Button>
                  {sent.status === 'failed' && !sent.atCalendar && (
                    <p role="alert" className="text-sm font-bold">
                      {sent.message}
                    </p>
                  )}
                  <p className="text-sm">{t('noChargeYet')}</p>
                </>
              )}
            </>
          )}
        </Card>
      </section>

      {/* Phones: the way to the panel stays at hand while the photos and the description scroll by. */}
      <div
        aria-hidden={panelInView || undefined}
        className={`border-ink bg-surface ease-yoyo fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t px-4 py-3 transition-transform duration-250 lg:hidden ${
          panelInView ? 'translate-y-full' : ''
        }`}
      >
        <p className="min-w-0 font-bold tabular-nums">{t('from', { price: formatEuros(daily, locale) })}</p>
        <Button
          tabIndex={panelInView ? -1 : undefined}
          onClick={() => {
            panel.current?.scrollIntoView({ block: 'start' });
            panel.current?.querySelector<HTMLButtonElement>('[role="grid"] button[tabindex="0"]')?.focus({ preventScroll: true });
          }}
        >
          {t('choose')}
        </Button>
      </div>
    </>
  );
}

/** Whether the element is on the screen (true when the browser cannot tell, so the bar stays away). */
function useInView(ref: RefObject<HTMLElement | null>): boolean {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') {
      setInView(true); // once, for browsers without the observer
      return;
    }
    const observer = new IntersectionObserver(([entry]) => setInView(entry?.isIntersecting ?? false), { threshold: 0.15 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return inView;
}
