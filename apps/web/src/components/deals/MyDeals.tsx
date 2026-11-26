'use client';

import type { BookingView } from '@yoyo/shared';
import { BOOKINGS_PAGE_SIZE } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { TransitionLink } from '@/components/motion/TransitionLink';
import { Reveal } from '@/components/motion/Reveal';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { formatPeriod } from '@/lib/deals/dates';
import { useDeadline } from '@/lib/deals/deadline';
import { useMoney } from '@/lib/deals/money';
import { useDealsSummary, useMyDeals } from '@/lib/deals/queries';
import { DEAL_ROLES, isMyTurn, type DealRole } from '@/lib/deals/status';
import { useErrorText } from '@/lib/forms/error-text';
import { useDurationText } from './Countdown';
import { DealStatusBadge } from './DealStatusBadge';
import { DealCover } from './DealView';

/** One deal in the list: the whole card is the link (the cover glides into the deal page). */
export function DealCard({ booking, index }: { booking: BookingView; index: number }) {
  const t = useTranslations('myDeals');
  const td = useTranslations('dealTimeline');
  const locale = useLocale();
  const money = useMoney();
  const duration = useDurationText();
  const mine = isMyTurn(booking.actions);
  const other = booking.viewerRole === 'OWNER' ? booking.renter.name : booking.owner.name;
  const left = useDeadline(booking.deadline?.dueAt ?? null);

  return (
    <Reveal as="li" index={index % 6}>
      <TransitionLink
        href={`/bookings/${booking.id}`}
        data-deal-card={booking.id}
        className="group sheet border-ink/15 rounded-media hover:border-ink focus-visible:border-ink relative flex h-full items-start gap-4 border p-4 transition-[border-color,translate] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 sm:items-center sm:p-5"
      >
        <DealCover booking={booking} size="card" />
        <div className="flex min-w-0 flex-1 flex-col gap-2 transition-transform duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <DealStatusBadge status={booking.status} />
            {mine && (
              <span
                className="rounded-pill bg-ink text-canvas border-ink inline-flex min-h-7 items-center border px-3 text-sm font-bold"
                data-your-turn=""
              >
                {t('yourTurn')}
              </span>
            )}
          </div>
          <h2
            data-cursor-text
            className="font-display text-3xl leading-[0.95] font-black [overflow-wrap:anywhere] uppercase"
          >
            {booking.listing.title}
          </h2>
          <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm">
            <span>{t(`with.${booking.viewerRole === 'OWNER' ? 'owner' : 'renter'}`, { name: other })}</span>
            <span className="font-bold">
              {formatPeriod(booking.period.start, booking.period.end, locale)}
            </span>
            <span className="font-bold tabular-nums">{money(booking.quote.totalCents)}</span>
          </p>
          {booking.deadline && left && !left.overdue && (
            <p className="text-sm tabular-nums">
              {td(`deadline.${booking.deadline.timer}`, { time: duration(left) })}
            </p>
          )}
        </div>
      </TransitionLink>
    </Reveal>
  );
}

function Page({ role, page, onTotal }: { role: DealRole; page: number; onTotal(total: number): void }) {
  const t = useTranslations('myDeals');
  const errorText = useErrorText();
  const query = useMyDeals(role, 'all', page);
  const total = query.data?.total;
  useEffect(() => {
    if (total !== undefined) onTotal(total);
  }, [total, onTotal]);

  if (query.isPending) {
    return (
      <>
        {[0, 1, 2].map((key) => (
          <li key={key} aria-hidden="true" className="border-ink/15 bg-mist/50 rounded-media h-32 animate-pulse border" />
        ))}
      </>
    );
  }
  if (query.isError) {
    return (
      <li role="alert" className="flex flex-col items-start gap-3 py-6 lg:col-span-2">
        <p className="font-bold">{t('loadFailed')}</p>
        <p>{errorText(query.error)}</p>
        <Button variant="ghost" onClick={() => void query.refetch()}>
          {t('retry')}
        </Button>
      </li>
    );
  }
  const items = query.data.items;
  return (
    <>
      {items.map((booking, index) => (
        <DealCard key={booking.id} booking={booking} index={index} />
      ))}
    </>
  );
}

function Empty({ role }: { role: DealRole }) {
  const t = useTranslations('myDeals');
  return (
    <EmptyState
      title={t(`empty.${role}`)}
      action={
        role === 'owner' ? (
          <Button href="/listings/new" size="lg">
            {t('lend')}
          </Button>
        ) : null
      }
    />
  );
}

/**
 * "My deals" (spec §4.2): tabs "I rent" / "I lend" with how many deals wait for this person, and one full
 * list under each — every deal with its status and, when it waits for you, "Your turn" (owner, 2026-11-16:
 * the groups hid deals and looked empty). The side is kept in the address (`?role=`),
 * so the view can be bookmarked and the back button returns to it from a deal.
 */
export function MyDeals({ initialRole }: { initialRole: DealRole }) {
  const t = useTranslations('myDeals');
  const summary = useDealsSummary();
  const [role, setRole] = useState<DealRole>(initialRole);
  const [pages, setPages] = useState(1);
  const [totals, setTotals] = useState<Record<number, number>>({});
  const tabs = useRef(new Map<DealRole, HTMLButtonElement>());

  function remember(nextRole: DealRole) {
    setRole(nextRole);
    setPages(1);
    setTotals({});
    const url = new URL(window.location.href);
    url.searchParams.set('role', nextRole);
    url.searchParams.delete('group');
    window.history.replaceState(window.history.state, '', url);
  }

  function onTabKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (
      event.key !== 'ArrowLeft' &&
      event.key !== 'ArrowRight' &&
      event.key !== 'Home' &&
      event.key !== 'End'
    )
      return;
    event.preventDefault();
    const index = DEAL_ROLES.indexOf(role);
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? DEAL_ROLES.length - 1
          : (index + (event.key === 'ArrowRight' ? 1 : -1) + DEAL_ROLES.length) % DEAL_ROLES.length;
    const nextRole = DEAL_ROLES[next]!;
    remember(nextRole);
    tabs.current.get(nextRole)?.focus();
  }

  const total = totals[1];
  const loadedAll = total === undefined || pages * BOOKINGS_PAGE_SIZE >= total;
  const waiting = (r: DealRole) => summary.data?.[r].needsAction ?? 0;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={t('title')} intro={t('intro')} count={total} />

      <div
        role="tablist"
        aria-label={t('roles')}
        className="border-ink bg-surface rounded-pill flex w-full max-w-md gap-1 self-start border p-1"
      >
        {DEAL_ROLES.map((r) => (
          <button
            key={r}
            ref={(element) => {
              if (element) tabs.current.set(r, element);
            }}
            role="tab"
            id={`deals-tab-${r}`}
            aria-selected={role === r}
            aria-controls="deals-panel"
            tabIndex={role === r ? 0 : -1}
            aria-describedby={waiting(r) > 0 ? `deals-badge-${r}` : undefined}
            onClick={() => remember(r)}
            onKeyDown={onTabKey}
            className={`rounded-pill ease-yoyo flex min-h-10 flex-1 items-center justify-center gap-2 px-4 text-sm font-bold transition-[background-color,color,transform] duration-250 active:scale-[0.96] ${
              role === r ? 'bg-cta text-cta-fg' : 'hover:bg-mist'
            }`}
          >
            {t(r)}
            {waiting(r) > 0 && (
              <span
                aria-hidden="true"
                className="rounded-pill bg-ink text-canvas animate-pop-in border-ink/15 inline-flex min-h-5 min-w-5 items-center justify-center border px-1.5 text-xs tabular-nums"
                data-badge={r}
              >
                {waiting(r)}
              </span>
            )}
            {waiting(r) > 0 && (
              <span id={`deals-badge-${r}`} hidden>
                {t('badge', { count: waiting(r) })}
              </span>
            )}
          </button>
        ))}
      </div>

      <div
        id="deals-panel"
        role="tabpanel"
        aria-labelledby={`deals-tab-${role}`}
        className="flex flex-col gap-6"
      >
        {total === 0 ? (
          <Empty role={role} />
        ) : (
          <>
            {total !== undefined && (
              <p className="sr-only" role="status">
                {t('count', { count: total })}
              </p>
            )}
            <ul
              className="grid gap-3 lg:grid-cols-2"
              key={role}
            >
              {Array.from({ length: pages }, (_, i) => (
                <Page
                  key={i}
                  role={role}
                  page={i + 1}
                  onTotal={(n) => setTotals((old) => (old[i + 1] === n ? old : { ...old, [i + 1]: n }))}
                />
              ))}
            </ul>
            {!loadedAll && (
              <Button variant="ghost" className="self-center" onClick={() => setPages((p) => p + 1)}>
                {t('more')}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
