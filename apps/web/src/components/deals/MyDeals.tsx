'use client';

import type { BookingView } from '@yoyo/shared';
import { BOOKINGS_PAGE_SIZE } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { TransitionLink } from '@/components/motion/TransitionLink';
import { Reveal } from '@/components/motion/Reveal';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Mark } from '@/components/brand/Mark';
import { displayFit } from '@/lib/display-fit';
import { formatPeriod } from '@/lib/deals/dates';
import { useDeadline } from '@/lib/deals/deadline';
import { useMoney } from '@/lib/deals/money';
import { useDealsSummary, useMyDeals } from '@/lib/deals/queries';
import { DEAL_GROUPS, DEAL_ROLES, type DealGroup, type DealRole } from '@/lib/deals/status';
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
  const mine = booking.actions.some((a) => a !== 'RESOLVE');
  const other = booking.viewerRole === 'OWNER' ? booking.renter.name : booking.owner.name;
  const left = useDeadline(booking.deadline?.dueAt ?? null);

  return (
    <Reveal as="li" index={index % 6}>
      <TransitionLink
        href={`/bookings/${booking.id}`}
        data-deal-card={booking.id}
        className="group border-ink/15 relative flex h-full items-start gap-4 border-b py-5 sm:items-center after:absolute after:inset-x-0 after:-bottom-px after:h-[1.5px] after:origin-right after:scale-x-0 after:bg-current after:transition-transform after:duration-[600ms] after:ease-[cubic-bezier(0.16,1,0.3,1)] hover:after:origin-left hover:after:scale-x-100 focus-visible:after:origin-left focus-visible:after:scale-x-100"
      >
        <DealCover booking={booking} size="card" />
        <div className="flex min-w-0 flex-1 flex-col gap-2 transition-transform duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <DealStatusBadge status={booking.status} />
            {mine && (
              <span className="rounded-pill bg-ink text-canvas border-ink inline-flex min-h-7 items-center border px-3 text-[13px] font-bold" data-your-turn="">
                {t('yourTurn')}
              </span>
            )}
          </div>
          <h2 data-cursor-text className="font-display text-[1.75rem] leading-[0.95] font-black uppercase [overflow-wrap:anywhere]">{booking.listing.title}</h2>
          <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm">
            <span>{t(`with.${booking.viewerRole === 'OWNER' ? 'owner' : 'renter'}`, { name: other })}</span>
            <span className="font-bold">{formatPeriod(booking.period.start, booking.period.end, locale)}</span>
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

function Page({ role, group, page, onTotal }: { role: DealRole; group: DealGroup; page: number; onTotal(total: number): void }) {
  const t = useTranslations('myDeals');
  const errorText = useErrorText();
  const query = useMyDeals(role, group === 'closed' ? 'closed' : 'open', page);
  const total = query.data?.total;
  useEffect(() => {
    if (total !== undefined) onTotal(total);
  }, [total, onTotal]);

  if (query.isPending) {
    return (
      <>
        {[0, 1, 2].map((key) => (
          <li key={key} aria-hidden="true" className="border-ink/15 bg-mist/50 h-32 animate-pulse border-b" />
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
  const items = group === 'action' ? query.data.items.filter((b) => b.actions.some((a) => a !== 'RESOLVE')) : query.data.items;
  return (
    <>
      {items.map((booking, index) => (
        <DealCard key={booking.id} booking={booking} index={index} />
      ))}
    </>
  );
}

function Empty({ role, group }: { role: DealRole; group: DealGroup }) {
  const t = useTranslations('myDeals');
  if (group !== 'open') {
    return <p className="border-ink/40 rounded-media border border-dashed p-8 text-center">{t(`empty.${group}`)}</p>;
  }
  return (
    <section className="border-ink/15 flex flex-col items-center gap-5 border-y px-6 py-16 text-center">
      <Mark size={88} string={false} className="animate-[spin_6s_linear_infinite] motion-reduce:animate-none" />
      <h2 className="font-display text-[clamp(1.9rem,3.2vw,2.8rem)] leading-[0.95] font-black uppercase">{t(`empty.${role}`)}</h2>
      <p className="max-w-[52ch] leading-relaxed">{t(`empty.${role}Body`)}</p>
      {role === 'owner' && (
        <Button href="/listings/new" size="lg">
          {t('lend')}
        </Button>
      )}
    </section>
  );
}

/**
 * "My deals" (spec §4.2): tabs "I rent" / "I lend" with how many deals wait for this person, and
 * groups "Waiting for me" / "Going on" / "Closed". The choice is kept in the address (`?role=&group=`),
 * so the view can be bookmarked and the back button returns to it from a deal.
 */
export function MyDeals({ initialRole, initialGroup }: { initialRole: DealRole; initialGroup: DealGroup }) {
  const t = useTranslations('myDeals');
  const summary = useDealsSummary();
  const [role, setRole] = useState<DealRole>(initialRole);
  const [group, setGroup] = useState<DealGroup>(initialGroup);
  const [pages, setPages] = useState(1);
  const [totals, setTotals] = useState<Record<number, number>>({});
  const tabs = useRef(new Map<DealRole, HTMLButtonElement>());

  function remember(nextRole: DealRole, nextGroup: DealGroup) {
    setRole(nextRole);
    setGroup(nextGroup);
    setPages(1);
    setTotals({});
    const url = new URL(window.location.href);
    url.searchParams.set('role', nextRole);
    url.searchParams.set('group', nextGroup);
    window.history.replaceState(window.history.state, '', url);
  }

  function onTabKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    const index = DEAL_ROLES.indexOf(role);
    const next =
      event.key === 'Home' ? 0 : event.key === 'End' ? DEAL_ROLES.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + DEAL_ROLES.length) % DEAL_ROLES.length;
    const nextRole = DEAL_ROLES[next]!;
    remember(nextRole, group);
    tabs.current.get(nextRole)?.focus();
  }

  const total = totals[1];
  const loadedAll = total === undefined || pages * BOOKINGS_PAGE_SIZE >= total;
  const waiting = (r: DealRole) => summary.data?.[r].needsAction ?? 0;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="@container flex min-w-0 flex-1 flex-col gap-2">
          <h1 style={displayFit(t('title'), { max: '3.5rem' })} className="font-display text-display-fit leading-[0.85] font-black uppercase">
            {t('title')}
          </h1>
          <p className="leading-relaxed">{t('intro')}</p>
        </div>
      </header>

      <div role="tablist" aria-label={t('roles')} className="border-ink bg-surface rounded-pill flex w-full max-w-md gap-1 self-start border p-1">
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
            onClick={() => remember(r, group)}
            onKeyDown={onTabKey}
            className={`rounded-pill ease-yoyo flex min-h-10 flex-1 items-center justify-center gap-2 px-4 text-sm font-bold transition-[background-color,color,transform] duration-250 active:scale-[0.96] ${
              role === r ? 'bg-cta text-cta-fg' : 'hover:bg-mist'
            }`}
          >
            {t(r)}
            {waiting(r) > 0 && (
              <span aria-hidden="true" className="rounded-pill bg-ink text-canvas animate-pop-in inline-flex min-h-5 min-w-5 items-center justify-center border border-ink/15 px-1.5 text-[11px] tabular-nums" data-badge={r}>
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

      <div id="deals-panel" role="tabpanel" aria-labelledby={`deals-tab-${role}`} className="flex flex-col gap-6">
        <div role="group" aria-label={t('groups')} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {DEAL_GROUPS.map((g, index) => (
            <Chip key={g} pressed={group === g} onPressedChange={() => remember(role, g)} tilt={index % 2 ? 'right' : 'left'} className="shrink-0">
              {t(`group.${g}`)}
            </Chip>
          ))}
        </div>

        {total === 0 ? (
          <Empty role={role} group={group} />
        ) : (
          <>
            {total !== undefined && (
              <p className="sr-only" role="status">
                {t('count', { count: total })}
              </p>
            )}
            <ul className="border-ink/15 grid border-t lg:grid-cols-2 lg:gap-x-[clamp(24px,3vw,56px)]" key={`${role}-${group}`}>
              {Array.from({ length: pages }, (_, i) => (
                <Page
                  key={i}
                  role={role}
                  group={group}
                  page={i + 1}
                  onTotal={(n) => setTotals((old) => (old[i + 1] === n ? old : { ...old, [i + 1]: n }))}
                />
              ))}
            </ul>
            {group === 'action' && total !== undefined && waiting(role) === 0 && summary.data && (
              <p className="border-ink/40 rounded-media border border-dashed p-8 text-center">{t('empty.action')}</p>
            )}
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
