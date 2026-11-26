'use client';

import { ADMIN_PAGE_SIZE, LEDGER_KINDS, type LedgerKind } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { Link, useRouter } from '@/i18n/navigation';
import { useLedgerOperations, useLedgerSummary } from '@/lib/admin/queries';
import { useMoney } from '@/lib/deals/money';
import {
  AdminEmpty,
  AdminPageHeader,
  AdminSelect,
  CountUp,
  Pager,
  Panel,
  StatCard,
  TABLE_CLASS,
  TD,
  TH,
} from './parts';

/**
 * The platform's books: what it holds by kind of account, the audit of the whole journal (balances
 * against entries, balanced operations, nothing below zero), and every operation with its postings.
 */
export function AdminMoney({ kind, page }: { kind?: LedgerKind; page: number }) {
  const t = useTranslations('admin');
  const tm = useTranslations('admin.money');
  const to = useTranslations('admin.overview');
  const money = useMoney();
  const locale = useLocale();
  const router = useRouter();
  const summary = useLedgerSummary();
  const ops = useLedgerOperations(kind, page);
  const when = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  const go = (next: { kind?: LedgerKind; page?: number }) => {
    const merged = { kind, page: 1, ...next };
    const params = new URLSearchParams();
    if (merged.kind) params.set('kind', merged.kind);
    if (merged.page > 1) params.set('page', String(merged.page));
    const query = params.toString();
    router.replace(query ? `/admin/money?${query}` : '/admin/money');
  };

  const pages = Math.max(1, Math.ceil((ops.data?.total ?? 0) / ADMIN_PAGE_SIZE));
  const audit = summary.data?.audit;
  const auditOk =
    audit &&
    audit.sumOfAll === 0 &&
    audit.mismatched.length === 0 &&
    audit.unbalancedOperations.length === 0 &&
    audit.negative.length === 0;

  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader title={tm('title')} />

      {summary.isPending ? (
        <div aria-busy="true" className="bg-mist rounded-media h-40" />
      ) : summary.isError ? (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p>{t('common.loadFailed')}</p>
          <Button variant="ghost" onClick={() => void summary.refetch()}>
            {t('common.retry')}
          </Button>
        </div>
      ) : (
        <>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {(
              [
                [to('revenue'), summary.data.revenueCents],
                [to('escrow'), summary.data.escrowCents],
                [to('deposits'), summary.data.depositsCents],
                [to('wallets'), summary.data.walletsCents],
                [tm('external'), summary.data.externalCents],
              ] as const
            ).map(([label, value]) => (
              <StatCard key={label} label={label} value={<CountUp value={value} format={money} />} />
            ))}
          </dl>

          <Panel title={tm('audit')} className={auditOk ? '' : 'border-ink border-2'}>
            {auditOk ? (
              <p className="flex items-start gap-2">
                <span aria-hidden="true" className="bg-ink mt-2 inline-block size-2 shrink-0 rounded-full" />
                {tm('auditOk')}
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="font-bold">{tm('auditBad')}</p>
                {(
                  [
                    [
                      'mismatched',
                      audit!.mismatched.map(
                        (m) => `${m.account}: ${money(m.cached)} ≠ ${money(m.fromEntries)}`,
                      ),
                    ],
                    ['unbalanced', audit!.unbalancedOperations],
                    ['negative', audit!.negative],
                  ] as const
                )
                  .filter(([, list]) => list.length > 0)
                  .map(([key, list]) => (
                    <div key={key}>
                      <p className="text-sm font-semibold">{tm(key)}</p>
                      <ul className="bg-mist mt-1 rounded-[12px] px-3 py-2 font-mono text-sm">
                        {list.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
              </div>
            )}
          </Panel>
        </>
      )}

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-4xl leading-none font-black uppercase">{tm('operations')}</h2>
          <AdminSelect
            label={tm('kindLabel')}
            value={kind ?? ''}
            onChange={(v) => go({ kind: (v || undefined) as LedgerKind | undefined })}
            options={[
              { value: '', label: tm('anyKind') },
              ...LEDGER_KINDS.map((k) => ({ value: k, label: tm(`kind.${k}`) })),
            ]}
          />
        </div>
        {ops.isPending ? (
          <div aria-busy="true" className="bg-mist rounded-media h-72" />
        ) : ops.isError ? (
          <div role="alert" className="flex flex-col items-start gap-3">
            <p>{t('common.loadFailed')}</p>
            <Button variant="ghost" onClick={() => void ops.refetch()}>
              {t('common.retry')}
            </Button>
          </div>
        ) : ops.data.items.length === 0 ? (
          <AdminEmpty title={t('common.empty')} />
        ) : (
          <div
            className="admin-glass border-ink/15 rounded-media relative overflow-x-auto border"
            tabIndex={0}
            role="region"
            aria-label={tm('operations')}
          >
            <table className={TABLE_CLASS}>
              <thead>
                <tr>
                  <th className={TH}>{tm('when')}</th>
                  <th className={TH}>{tm('kindLabel')}</th>
                  <th className={TH}>{tm('deal')}</th>
                  <th className={TH}>{tm('postings')}</th>
                </tr>
              </thead>
              <tbody>
                {ops.data.items.map((op) => (
                  <tr key={op.id} className="align-top">
                    <td className={`${TD} whitespace-nowrap tabular-nums`}>
                      {when.format(new Date(op.createdAt))}
                    </td>
                    <td className={`${TD} font-semibold`}>{tm(`kind.${op.kind}`)}</td>
                    <td className={TD}>
                      {op.bookingId ? (
                        <Link
                          href={`/admin/deals/${op.bookingId}`}
                          className="font-mono text-sm underline decoration-1 underline-offset-2"
                        >
                          {op.bookingId.slice(-8)}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className={`${TD} font-mono text-sm`}>
                      {op.postings.map((p) => (
                        <span key={p.account} className="flex justify-between gap-6">
                          <span className="truncate">{p.account}</span>
                          <span className="tabular-nums">{money(p.amount)}</span>
                        </span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pager page={page} pages={pages} onPage={(p) => go({ page: p })} />
      </section>
    </div>
  );
}
