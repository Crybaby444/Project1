'use client';

import type { AdminUserDetail } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import { DealStatusBadge } from '@/components/deals/DealStatusBadge';
import { ListingStatusBadge } from '@/components/listings/ListingStatusBadge';
import { Stars } from '@/components/reviews/Stars';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { TEXTAREA_CLASS } from '@/components/ui/inputs';
import { useToast } from '@/components/ui/Toast';
import { Link } from '@/i18n/navigation';
import { useAdminPerson, useAdminPersonAction, useBlockUser } from '@/lib/admin/queries';
import { useMoney } from '@/lib/deals/money';
import { Panel } from './parts';

/**
 * One person for an administrator: who they are and when they were last here, their numbers, their
 * items (take one down with a reason), deals, reviews about them (hide an abusive one), complaints,
 * and private notes. Block or unblock from the header.
 */
export function AdminPerson({ id }: { id: string }) {
  const t = useTranslations('admin');
  const person = useAdminPerson(id);
  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/users" className="text-ink/75 self-start text-sm font-semibold hover:underline">
        ← {t('person.back')}
      </Link>
      {person.isPending ? (
        <div aria-busy="true" className="bg-mist rounded-media h-96" />
      ) : person.isError ? (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p>{t('common.loadFailed')}</p>
          <Button variant="ghost" onClick={() => void person.refetch()}>
            {t('common.retry')}
          </Button>
        </div>
      ) : (
        <Body d={person.data} />
      )}
    </div>
  );
}

type Ask = { kind: 'takedown'; id: string; title: string } | { kind: 'hide'; id: string } | null;

function Body({ d }: { d: AdminUserDetail }) {
  const t = useTranslations('admin.person');
  const tu = useTranslations('admin.users');
  const trs = useTranslations('report.reason');
  const tst = useTranslations('admin.reports');
  const locale = useLocale();
  const money = useMoney();
  const toast = useToast();
  const block = useBlockUser();
  const act = useAdminPersonAction();
  const [ask, setAsk] = useState<Ask>(null);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const date = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  const moment = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const done = { onSuccess: () => toast.show(t('done')), onError: () => toast.show(t('failed')) };
  const state = d.user.deletedAt ? 'deleted' : d.user.blockedAt ? 'blocked' : 'active';

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="font-display text-[clamp(2.4rem,4.6vw,3.8rem)] leading-[0.92] font-black uppercase [overflow-wrap:anywhere]">{d.user.name}</h1>
          <p className="text-ink/80 [overflow-wrap:anywhere]">{d.user.email}</p>
          <ul className="flex flex-wrap gap-1.5 text-[12px] font-bold">
            <li className={`rounded-pill px-2.5 py-0.5 ${state === 'active' ? 'border-ink/25 border' : 'bg-ink text-canvas'}`}>{tu(state)}</li>
            <li className="border-ink/25 rounded-pill border px-2.5 py-0.5">{tu(`roles.${d.user.role}`)}</li>
            <li className="border-ink/25 rounded-pill border px-2.5 py-0.5">{d.user.emailVerified ? tu('verified') : tu('unverified')}</li>
            <li className="border-ink/25 rounded-pill border px-2.5 py-0.5 uppercase">{d.user.locale}</li>
          </ul>
          <p className="text-ink/70 text-sm">
            {t('joined', { date: date.format(new Date(d.user.createdAt)) })} ·{' '}
            {d.user.lastSeenAt ? t('lastSeen', { date: moment.format(new Date(d.user.lastSeenAt)) }) : t('never')}
          </p>
        </div>
        {d.user.role !== 'ADMIN' && !d.user.deletedAt && (
          <Button
            variant={d.user.blockedAt ? 'primary' : 'ghost'}
            loading={block.isPending}
            onClick={() => block.mutate({ id: d.user.id, block: !d.user.blockedAt }, done)}
          >
            {d.user.blockedAt ? tu('unblock') : tu('block')}
          </Button>
        )}
      </header>

      <dl className="border-ink/15 grid grid-cols-2 border-y sm:grid-cols-4 xl:grid-cols-8">
        {(
          [
            ['listings', String(d.stats.listings)],
            ['dealsAsRenter', String(d.stats.dealsAsRenter)],
            ['dealsAsOwner', String(d.stats.dealsAsOwner)],
            ['completed', String(d.stats.completed)],
            ['rating', d.stats.rating !== null ? `${d.stats.rating} (${d.stats.reviews})` : '—'],
            ['wallet', money(d.stats.walletCents)],
            ['earned', money(d.stats.earnedCents)],
            ['reportsAgainst', String(d.stats.reportsAgainst)],
          ] as const
        ).map(([key, value]) => (
          <div key={key} className="border-ink/10 flex flex-col gap-1 border-b px-1 py-4 sm:px-3">
            <dt className="text-ink/70 text-[13px] font-semibold">{t(`stats.${key}`)}</dt>
            <dd className={`font-display text-[1.9rem] leading-none font-black tabular-nums ${key === 'reportsAgainst' && d.stats.reportsAgainst > 0 ? 'underline decoration-2 underline-offset-4' : ''}`}>
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title={t('listings')}>
          <Rows empty={d.listings.length === 0}>
            {d.listings.map((l) => (
              <li key={l.id} className="flex flex-col gap-1.5 py-3">
                <Link href={`/listings/${l.id}`} className="truncate font-semibold hover:underline">
                  {l.title || '—'}
                </Link>
                <div className="flex flex-wrap items-center gap-3">
                  <ListingStatusBadge status={l.status as never} />
                  {l.dailyCents !== null && <span className="tabular-nums text-sm">{money(l.dailyCents)}</span>}
                  {(l.status === 'PUBLISHED' || l.status === 'HIDDEN') && (
                    <button type="button" onClick={() => setAsk({ kind: 'takedown', id: l.id, title: l.title })} className="ml-auto text-sm font-bold underline decoration-1 underline-offset-4">
                      {t('takedown')}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </Rows>
        </Panel>

        <Panel title={t('deals')}>
          <Rows empty={d.deals.length === 0}>
            {d.deals.map((deal) => (
              <li key={deal.id} className="flex flex-col gap-1.5 py-3">
                <Link href={`/admin/deals/${deal.id}`} className="truncate font-semibold hover:underline">
                  {deal.title || '—'}
                </Link>
                <div className="flex flex-wrap items-center gap-3">
                  <DealStatusBadge status={deal.status as never} />
                  <span className="text-ink/70 text-sm">{t(`role.${deal.role}`)}</span>
                  <span className="ml-auto tabular-nums text-sm font-semibold">{money(deal.totalCents)}</span>
                </div>
              </li>
            ))}
          </Rows>
        </Panel>

        <Panel title={t('reviews')}>
          <Rows empty={d.reviews.length === 0}>
            {d.reviews.map((r) => (
              <li key={r.id} className={`flex flex-col gap-1.5 py-3 ${r.hidden ? 'opacity-60' : ''}`}>
                <div className="flex flex-wrap items-center gap-3">
                  <Stars value={r.rating} size={13} />
                  <span className="text-sm font-semibold">{r.author}</span>
                  <span className="text-ink/70 text-[13px]">{date.format(new Date(r.createdAt))}</span>
                  {r.hidden && <span className="bg-ink text-canvas rounded-pill px-2 py-0.5 text-[11px] font-bold">{t('hidden')}</span>}
                  <button
                    type="button"
                    onClick={() => (r.hidden ? act.mutate({ kind: 'showReview', reviewId: r.id }, done) : setAsk({ kind: 'hide', id: r.id }))}
                    className="ml-auto text-sm font-bold underline decoration-1 underline-offset-4"
                  >
                    {r.hidden ? t('show') : t('hide')}
                  </button>
                </div>
                <p className="text-[15px] [overflow-wrap:anywhere]">{r.text}</p>
              </li>
            ))}
          </Rows>
        </Panel>

        <Panel title={t('reports')}>
          <Rows empty={d.reports.length === 0}>
            {d.reports.map((r) => (
              <li key={r.id} className="flex flex-col gap-1 py-3">
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="bg-ink text-canvas rounded-pill px-2 py-0.5 text-[12px] font-bold">{trs.has(r.reason) ? trs(r.reason) : r.reason}</span>
                  <span className="text-ink/70">{date.format(new Date(r.createdAt))}</span>
                  <span className="border-ink/25 rounded-pill border px-2 py-0.5 text-[12px] font-bold">{tst(r.status.toLowerCase() as 'open' | 'resolved' | 'dismissed')}</span>
                </p>
                {r.note && <p className="text-[15px] [overflow-wrap:anywhere]">{r.note}</p>}
              </li>
            ))}
          </Rows>
        </Panel>
      </div>

      <Panel title={t('notes')}>
        <p className="text-ink/70 -mt-2 text-sm">{t('notesHint')}</p>
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!note.trim()) return;
            act.mutate({ kind: 'note', userId: d.user.id, text: note.trim() }, { ...done, onSuccess: () => { setNote(''); toast.show(t('done')); } });
          }}
        >
          <label className="sr-only" htmlFor="admin-note">
            {t('addNote')}
          </label>
          <textarea id="admin-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('notePlaceholder')} maxLength={2000} className={`${TEXTAREA_CLASS} min-h-20`} />
          <Button type="submit" className="self-start" disabled={!note.trim()} loading={act.isPending}>
            {t('addNote')}
          </Button>
        </form>
        {d.notes.length > 0 && (
          <ol className="divide-ink/10 flex flex-col divide-y">
            {d.notes.map((n) => (
              <li key={n.id} className="py-3">
                <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{n.text}</p>
                <p className="text-ink/70 mt-1 text-[13px]">
                  {n.admin} · {moment.format(new Date(n.createdAt))}
                </p>
              </li>
            ))}
          </ol>
        )}
      </Panel>

      <Dialog
        open={ask !== null}
        onClose={() => {
          setAsk(null);
          setReason('');
        }}
        title={ask?.kind === 'takedown' ? t('takedownTitle', { title: ask.title }) : t('hideTitle')}
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!ask || reason.trim().length < 3) return;
            const after = { onSuccess: () => { setAsk(null); setReason(''); toast.show(t('done')); }, onError: () => toast.show(t('failed')) };
            if (ask.kind === 'takedown') act.mutate({ kind: 'takedown', listingId: ask.id, reason: reason.trim() }, after);
            else act.mutate({ kind: 'hideReview', reviewId: ask.id, reason: reason.trim() }, after);
          }}
        >
          <p className="leading-relaxed">{ask?.kind === 'takedown' ? t('takedownBody') : t('hideBody')}</p>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold">{t('reason')}</span>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} className={`${TEXTAREA_CLASS} min-h-20`} />
          </label>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setAsk(null)}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={reason.trim().length < 3} loading={act.isPending}>
              {ask?.kind === 'takedown' ? t('confirm') : t('hide')}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

function Rows({ empty, children }: { empty: boolean; children: ReactNode }) {
  const t = useTranslations('admin.person');
  if (empty) return <p className="text-ink/70 text-sm">{t('none')}</p>;
  return <ul className="divide-ink/10 -mt-2 flex flex-col divide-y">{children}</ul>;
}
