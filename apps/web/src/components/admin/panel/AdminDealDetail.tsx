'use client';

import { RESOLVE_DECISIONS, type AdminBookingDetail } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useId, useState, type FormEvent } from 'react';
import { DealStatusBadge } from '@/components/deals/DealStatusBadge';
import { Button } from '@/components/ui/Button';
import { TEXTAREA_CLASS } from '@/components/ui/inputs';
import { useToast } from '@/components/ui/Toast';
import { Link } from '@/i18n/navigation';
import { useAdminDeal, useResolveDispute, type ResolveDecision } from '@/lib/admin/queries';
import { formatMoment, formatPeriod } from '@/lib/deals/dates';
import { useMoney } from '@/lib/deals/money';
import { Panel } from './parts';

/**
 * One deal as an administrator sees it: the sides, the money, the dispute and its decision, then the
 * journal, card payments, ledger operations and photos. A dispute is decided here with the deal's
 * version (a newer step in between is refused) and an Idempotency-Key, after a confirmation.
 */
export function AdminDealDetail({ id }: { id: string }) {
  const t = useTranslations('admin');
  const deal = useAdminDeal(id);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/deals" className="text-ink/75 self-start text-sm font-semibold hover:underline">
        ← {t('deals.back')}
      </Link>
      {deal.isPending ? (
        <div aria-busy="true" className="bg-mist rounded-media h-96" />
      ) : deal.isError ? (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p>{t('common.loadFailed')}</p>
          <Button variant="ghost" onClick={() => void deal.refetch()}>
            {t('common.retry')}
          </Button>
        </div>
      ) : (
        <Body data={deal.data} />
      )}
    </div>
  );
}

function Body({ data }: { data: AdminBookingDetail }) {
  const t = useTranslations('admin.deals');
  const tk = useTranslations('admin.money.kind');
  const locale = useLocale();
  const money = useMoney();
  const { booking: b } = data;
  const moment = (iso: string) => formatMoment(iso, locale, b.timeZone);

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <DealStatusBadge status={b.status} className="self-start" />
          <h1 className="font-display text-[clamp(2.2rem,4.4vw,3.6rem)] leading-[0.92] font-black uppercase [overflow-wrap:anywhere]">{b.listing.title}</h1>
          <p className="text-ink/70 text-sm tabular-nums">
            {formatPeriod(b.period.start, b.period.end, locale)} · {b.id}
          </p>
        </div>
        <Button href={`/bookings/${b.id}`} variant="ghost">
          {t('publicPage')}
        </Button>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-5">
          {b.dispute && (
            <Panel title={t('dispute')} className="border-ink border-2">
              <dl className="grid gap-3 text-[15px] sm:grid-cols-[10rem_minmax(0,1fr)]">
                <dt className="text-ink/70">{t('reason')}</dt>
                <dd className="font-semibold">{t(`disputeReason.${b.dispute.reason}`)}</dd>
                <dt className="text-ink/70">{t('openedAt')}</dt>
                <dd className="tabular-nums">{moment(b.dispute.openedAt)}</dd>
                {b.dispute.note && (
                  <>
                    <dt className="text-ink/70">{t('note')}</dt>
                    <dd className="whitespace-pre-wrap">{b.dispute.note}</dd>
                  </>
                )}
                {b.damage && (
                  <>
                    <dt className="text-ink/70">{t('damage')}</dt>
                    <dd className="whitespace-pre-wrap">{b.damage.description}</dd>
                  </>
                )}
              </dl>
              {b.dispute.resolution ? (
                <p className="bg-mist rounded-media p-4 font-semibold">
                  {t('resolved', { decision: t(`decision.${b.dispute.resolution.decision}`) })}
                  <span className="text-ink/75 mt-1 block font-normal whitespace-pre-wrap">{b.dispute.resolution.comment}</span>
                </p>
              ) : (
                b.status === 'DISPUTED' && <ResolveForm id={b.id} version={b.version} />
              )}
            </Panel>
          )}

          <Panel title={t('journal')}>
            <ol className="flex flex-col">
              {data.events.map((e) => (
                <li key={e.id} className="border-ink/10 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 border-b py-2.5 last:border-b-0">
                  <time dateTime={e.createdAt} className="text-ink/70 text-[13px] whitespace-nowrap tabular-nums">
                    {moment(e.createdAt)}
                  </time>
                  <span className="min-w-0 text-[15px]">
                    <span className="font-semibold">{e.type}</span>
                    <span className="text-ink/70">
                      {' '}
                      · {e.actorKind} · {e.fromStatus ?? '—'} → {e.toStatus}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel title={t('ledger')}>
            {data.operations.length === 0 ? (
              <p className="text-ink/70">{t('none')}</p>
            ) : (
              <ul className="flex flex-col gap-4">
                {data.operations.map((op) => (
                  <li key={op.id} className="flex flex-col gap-1.5">
                    <p className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-semibold">{tk(op.kind)}</span>
                      <time dateTime={op.createdAt} className="text-ink/70 text-[13px] tabular-nums">
                        {moment(op.createdAt)}
                      </time>
                    </p>
                    <ul className="bg-mist rounded-[12px] px-3 py-2 font-mono text-[13px]">
                      {op.postings.map((p) => (
                        <li key={p.account} className="flex justify-between gap-4">
                          <span className="truncate">{p.account}</span>
                          <span className="tabular-nums">{money(p.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="flex flex-col gap-5">
          <Panel title={t('parties')}>
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-[15px]">
              <dt className="text-ink/70">{t('renter')}</dt>
              <dd className="font-semibold">
                <Link href={`/u/${b.renter.id}`} className="hover:underline">
                  {b.renter.name}
                </Link>
              </dd>
              <dt className="text-ink/70">{t('owner')}</dt>
              <dd className="font-semibold">
                <Link href={`/u/${b.owner.id}`} className="hover:underline">
                  {b.owner.name}
                </Link>
              </dd>
            </dl>
          </Panel>

          <Panel title={t('money')}>
            <dl className="divide-ink/10 flex flex-col divide-y text-[15px]">
              {(
                [
                  ['rent', b.quote.rentCents],
                  ['fee', b.quote.serviceFeeCents],
                  ['deposit', b.quote.depositCents],
                ] as const
              ).map(([key, value]) => (
                <div key={key} className="flex justify-between gap-4 py-2">
                  <dt className="text-ink/75">{t(key)}</dt>
                  <dd className="tabular-nums">{money(value)}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-4 py-2 font-bold">
                <dt>{t('totalPaid')}</dt>
                <dd className="tabular-nums">{money(b.quote.totalCents)}</dd>
              </div>
            </dl>
          </Panel>

          <Panel title={t('payments')}>
            {data.payments.length === 0 ? (
              <p className="text-ink/70">{t('none')}</p>
            ) : (
              <ul className="flex flex-col gap-2 text-[15px]">
                {data.payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap justify-between gap-2">
                    <span>
                      {p.brand} ···· {p.last4}
                    </span>
                    <span className="tabular-nums">
                      {money(p.amountCents)}
                      {p.refundedCents > 0 && <span className="text-ink/70"> · {t('refunded', { amount: money(p.refundedCents) })}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {data.photos.length > 0 && (
            <Panel title={t('photos')}>
              <ul className="grid grid-cols-3 gap-2">
                {data.photos.map((p) => (
                  <li key={p.id}>
                    <a href={p.urls.full} target="_blank" rel="noreferrer" className="block">
                      {/* eslint-disable-next-line @next/next/no-img-element -- deal photos from the photo store */}
                      <img src={p.urls.thumb} alt={p.kind} width={p.width} height={p.height} className="bg-mist aspect-square w-full rounded-[12px] object-cover" />
                    </a>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}

function ResolveForm({ id, version }: { id: string; version: number }) {
  const t = useTranslations('admin.deals');
  const toast = useToast();
  const resolve = useResolveDispute(id);
  const [decision, setDecision] = useState<ResolveDecision | null>(null);
  const [comment, setComment] = useState('');
  const [confirming, setConfirming] = useState(false);
  const titleId = useId();
  const hintId = useId();
  const ready = decision !== null && comment.trim().length > 0;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!ready) return;
    if (!confirming) {
      setConfirming(true);
      return;
    }
    resolve.mutate(
      { version, decision, comment: comment.trim() },
      {
        onSuccess: () => toast.show(t('resolve.done')),
        onError: () => setConfirming(false),
      },
    );
  }

  return (
    <form aria-labelledby={titleId} onSubmit={submit} className="border-ink/15 flex flex-col gap-4 border-t pt-5">
      <h3 id={titleId} className="font-display text-[1.9rem] leading-none font-black uppercase">
        {t('resolve.title')}
      </h3>
      <fieldset disabled={confirming || resolve.isPending} className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold">{t('resolve.decision')}</legend>
        {RESOLVE_DECISIONS.map((d) => (
          <label
            key={d}
            className={`rounded-media flex min-h-11 cursor-pointer items-center gap-3 border px-4 py-2.5 text-[15px] ${decision === d ? 'border-ink bg-ink/[0.04] font-semibold' : 'border-ink/20'}`}
          >
            <input type="radio" name="decision" value={d} checked={decision === d} onChange={() => setDecision(d)} className="accent-[var(--ink)] size-4" />
            {t(`decision.${d}`)}
          </label>
        ))}
      </fieldset>
      <div className="flex flex-col gap-2">
        <label htmlFor={`${titleId}-comment`} className="text-sm font-semibold">
          {t('resolve.comment')}
        </label>
        <textarea
          id={`${titleId}-comment`}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          disabled={confirming || resolve.isPending}
          aria-describedby={hintId}
          maxLength={2000}
          className={TEXTAREA_CLASS}
        />
        <span id={hintId} className="text-ink/70 text-[13px]">
          {t('resolve.commentHint')}
        </span>
      </div>
      {resolve.isError && (
        <p role="alert" className="font-semibold">
          {t('resolve.failed')}
        </p>
      )}
      {confirming ? (
        <div role="alertdialog" aria-labelledby={`${titleId}-confirm`} className="border-ink bg-surface rounded-media flex flex-col gap-3 border-2 p-4">
          <p id={`${titleId}-confirm`} className="font-semibold">
            {t('resolve.confirm')}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={resolve.isPending}>
              {t('resolve.submit')}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setConfirming(false)} disabled={resolve.isPending}>
              {t('resolve.cancel')}
            </Button>
          </div>
        </div>
      ) : (
        <Button type="submit" disabled={!ready} className="self-start">
          {t('resolve.submit')}
        </Button>
      )}
    </form>
  );
}
