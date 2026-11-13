'use client';

import type { BookingView } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Mark } from '@/components/brand/Mark';
import { TransitionLink } from '@/components/motion/TransitionLink';
import { Button } from '@/components/ui/Button';
import { displayFit } from '@/lib/display-fit';
import { formatMoment, formatPeriod } from '@/lib/deals/dates';
import { useDeal, useDealHistory, useRefreshAfterDeal } from '@/lib/deals/queries';
import { useErrorText } from '@/lib/forms/error-text';
import { ApiError } from '@/lib/session/api-error';
import { ContractCard } from './ContractCard';
import { DealActions } from './DealActions';
import { DealPhotos } from './DealPhotos';
import { DealStatusBadge } from './DealStatusBadge';
import { DealSummary } from './DealSummary';
import { DealTimeline } from './DealTimeline';

/** Answers that mean "the deal moved on while you were looking": read it again and say so. */
const MOVED = new Set(['DEADLINE_PASSED', 'ACTION_NOT_ALLOWED', 'INVALID_STATUS', 'IDEMPOTENCY_KEY_REUSED']);

/** The item's cover; during a move from "My deals" it glides from the card into place (motion.css). */
export function DealCover({ booking, size }: { booking: Pick<BookingView, 'id' | 'listing'>; size: 'card' | 'page' }) {
  return (
    <div
      data-deal-cover={booking.id}
      style={{ '--vt-name': `deal-cover-${booking.id.replace(/[^A-Za-z0-9_-]/g, '')}` } as React.CSSProperties}
      className={`border-ink bg-mist rounded-media shrink-0 overflow-hidden border ${size === 'page' ? 'size-24 sm:size-28' : 'size-20'}`}
    >
      {booking.listing.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- sized by the API's storage
        <img src={booking.listing.coverUrl} alt="" width={160} height={120} className="size-full object-cover" />
      ) : (
        <span aria-hidden="true" className="bg-mist grid size-full place-items-center text-2xl font-black text-ink">
          {Array.from(booking.listing.title)[0]?.toLocaleUpperCase() ?? 'Y'}
        </span>
      )}
    </div>
  );
}

function Panel({ title, tone = 'bg-surface', children }: { title: string; tone?: string; children: React.ReactNode }) {
  return (
    <section className={`border-ink rounded-media flex flex-col gap-2 border p-5 ${tone}`}>
      <h2 className="text-[13px] font-bold tracking-[0.03em] uppercase">{title}</h2>
      {children}
    </section>
  );
}

/**
 * The deal page (spec §4.4, route /bookings/:id): who, what, when, where the deal is and what comes
 * next, the buttons this side may press, the contract, the money and the item's photos. The other
 * side may act at any time: the page reads the deal again on focus and when a deadline runs out, and
 * a step refused because the deal moved on reads it again and says so.
 */
export function DealView({ id }: { id: string }) {
  const t = useTranslations('deal');
  const ts = useTranslations('dealStatus');
  const locale = useLocale();
  const errorText = useErrorText();
  const deal = useDeal(id);
  const history = useDealHistory(id);
  const refresh = useRefreshAfterDeal();
  const [notice, setNotice] = useState<string | null>(null);
  const [announce, setAnnounce] = useState('');
  const lastStatus = useRef<string | null>(null);

  const status = deal.data?.status;
  useEffect(() => {
    if (!status) return;
    if (lastStatus.current && lastStatus.current !== status) setAnnounce(t('changed', { status: ts(status) }));
    lastStatus.current = status;
  }, [status, t, ts]);

  const reload = useCallback(() => {
    void refresh();
  }, [refresh]);

  const onError = useCallback(
    (error: unknown) => {
      if (error instanceof ApiError && MOVED.has(error.code)) {
        setNotice(t('moved'));
        void refresh();
      } else setNotice(errorText(error));
    },
    [errorText, refresh, t],
  );

  if (deal.isPending) {
    return (
      <div aria-busy="true" className="flex flex-col gap-6">
        <span className="sr-only">{t('loading')}</span>
        <div aria-hidden="true" className="flex items-center gap-5">
          <div className="bg-mist rounded-media size-24 animate-pulse sm:size-28" />
          <div className="bg-mist rounded-pill h-10 w-2/3 animate-pulse" />
        </div>
        <div aria-hidden="true" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="rounded-media border-ink/20 bg-surface h-[32rem] animate-pulse border" />
          <div className="rounded-media border-ink/20 bg-surface h-72 animate-pulse border" />
        </div>
      </div>
    );
  }

  if (deal.isError) {
    const missing = deal.error instanceof ApiError && deal.error.code === 'NOT_FOUND';
    return missing ? (
      <section role="alert" className="border-ink bg-surface rounded-media flex flex-col items-center gap-4 border px-6 py-14 text-center">
        <Mark size={80} string={false} className="animate-[spin_6s_linear_infinite] motion-reduce:animate-none" />
        <h1 className="text-3xl font-bold">{t('notFound')}</h1>
        <p className="max-w-[46ch]">{t('notFoundBody')}</p>
        <Button href="/bookings">{t('back')}</Button>
      </section>
    ) : (
      <div role="alert" className="border-ink bg-surface rounded-media flex flex-col items-start gap-3 border p-6">
        <p className="font-bold">{t('loadFailed')}</p>
        <p>{errorText(deal.error)}</p>
        <Button variant="ghost" onClick={() => void deal.refetch()}>
          {t('retry')}
        </Button>
      </div>
    );
  }

  const booking = deal.data;
  const title = t('title', { item: booking.listing.title });
  const parties =
    booking.viewerRole === 'RENTER'
      ? t('youRent', { name: booking.owner.name })
      : booking.viewerRole === 'OWNER'
        ? t('youLend', { name: booking.renter.name })
        : t('adminView', { renter: booking.renter.name, owner: booking.owner.name });
  const myTurn = booking.actions.some((a) => a !== 'RESOLVE');
  const closed = ['COMPLETED', 'DECLINED', 'EXPIRED', 'CANCELLED'].includes(booking.status);

  return (
    <div className="flex flex-col gap-8" data-deal={booking.id} data-deal-status={booking.status}>
      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>
      <TransitionLink href="/bookings" className="rounded-pill ease-yoyo -ml-1 inline-flex min-h-10 items-center gap-2 self-start px-2 text-sm font-bold transition-transform duration-150 hover:-translate-x-0.5">
        <span aria-hidden="true">←</span> {t('back')}
      </TransitionLink>

      <header className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <DealCover booking={booking} size="page" />
        <div className="@container flex min-w-0 flex-1 flex-col gap-3">
          <h1 style={displayFit(title, { max: '3rem' })} className="font-display text-display-fit leading-[0.9] font-black uppercase [overflow-wrap:anywhere]">
            {title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[15px]">
            <DealStatusBadge status={booking.status} />
            {!closed && (
              <span
                data-turn={myTurn ? 'mine' : 'theirs'}
                className={`rounded-pill inline-flex min-h-7 items-center border px-3 text-[13px] font-bold ${myTurn ? 'bg-cta text-cta-fg border-cta' : 'border-ink'}`}
              >
                {myTurn ? t('yourTurn') : t('theirTurn')}
              </span>
            )}
            <span>{parties}</span>
            <span className="font-bold">
              {t('period', { period: formatPeriod(booking.period.start, booking.period.end, locale), days: booking.quote.days })}
            </span>
          </div>
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <DealTimeline booking={booking} history={history.data ?? []} onDeadline={reload} />
          {booking.message && (
            <Panel title={t('message')}>
              <p className="[overflow-wrap:anywhere] whitespace-pre-line">{booking.message}</p>
            </Panel>
          )}
          {booking.declineReason && (
            <Panel title={t('declined')} tone="bg-mist">
              <p className="[overflow-wrap:anywhere] whitespace-pre-line">{booking.declineReason}</p>
            </Panel>
          )}
          {booking.cancellation && (
            <Panel title={t('cancelled', { by: t(`by.${booking.cancellation.by}`) })} tone="bg-mist">
              {booking.cancellation.reason && <p className="[overflow-wrap:anywhere] whitespace-pre-line">{booking.cancellation.reason}</p>}
              <p className="text-sm">{formatMoment(booking.cancellation.at, locale, booking.timeZone)}</p>
            </Panel>
          )}
          {booking.damage && (
            <Panel title={t('damage.title')} tone="bg-surface">
              <p className="[overflow-wrap:anywhere] whitespace-pre-line">{booking.damage.description}</p>
            </Panel>
          )}
          {booking.dispute && (
            <section className="rounded-media flex flex-col gap-2 border border-ink/15 bg-[color-mix(in_srgb,var(--danger)_22%,var(--surface))] p-5" data-dispute="">
              <h2 className="text-[13px] font-bold tracking-[0.03em] uppercase">
                {t('dispute.title')} · {t(`dispute.reason.${booking.dispute.reason}`)}
              </h2>
              {booking.dispute.note && <p className="[overflow-wrap:anywhere] whitespace-pre-line">{booking.dispute.note}</p>}
              {booking.dispute.resolution ? (
                <div className="flex flex-col gap-1">
                  <p className="font-bold" data-resolution={booking.dispute.resolution.decision}>
                    {t(`dispute.decision.${booking.dispute.resolution.decision}`)}
                  </p>
                  <p className="[overflow-wrap:anywhere] whitespace-pre-line">{booking.dispute.resolution.comment}</p>
                </div>
              ) : (
                <p className="text-sm font-bold">{t('dispute.waiting')}</p>
              )}
            </section>
          )}
          <DealPhotos booking={booking} />
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-24">
          <section aria-label={myTurn ? t('yourTurn') : t('theirTurn')} className="border-ink bg-surface rounded-media flex flex-col gap-3 border p-5 sm:p-6">
            {notice && (
              <p role="alert" className="rounded-media border-ink flex items-start gap-2 border p-3 text-sm font-bold">
                <span aria-hidden="true" className="bg-ink text-canvas mt-0.5 inline-block size-4 shrink-0 rounded-full border border-ink/15" />
                {notice}
              </p>
            )}
            {myTurn ? (
              <DealActions
                booking={booking}
                onError={(error) => {
                  onError(error);
                }}
              />
            ) : (
              <p className="text-sm">{t('nothingToDo')}</p>
            )}
          </section>
          <ContractCard booking={booking} />
          <DealSummary booking={booking} />
        </aside>
      </div>
    </div>
  );
}
