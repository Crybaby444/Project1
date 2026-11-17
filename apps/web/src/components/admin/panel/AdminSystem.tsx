'use client';

import { useEffect, useState } from 'react';

import { ADMIN_EXPORTS } from '@yoyo/shared';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { unwrap } from '@/lib/session/api-error';
import { useApiClient } from '@/lib/session/SessionProvider';
import { useAdminSystem, useServerErrors } from '@/lib/admin/queries';
import { AdminPageHeader, Panel } from './parts';

/** A green-or-not light: a filled dot when fine, a ring with words when not. */
function Light({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`rounded-pill inline-flex items-center gap-2 self-start px-3 py-1 text-sm font-bold ${ok ? 'border-ink/20 border' : 'bg-ink text-canvas'}`}>
      <span aria-hidden="true" className={`inline-block size-2 rounded-full ${ok ? 'bg-ink' : 'bg-[var(--danger)]'}`} />
      {label}
    </span>
  );
}

/**
 * System (admin): is the database answering and how fast, how much of the 24-hour mail budget is used,
 * whether the deal deadlines job keeps up, which providers run, how many records there are — refreshed
 * every 30 s — and CSV exports of people, items, deals and the ledger.
 */
export function AdminSystem() {
  const t = useTranslations('admin');
  const ts = useTranslations('admin.system');
  const locale = useLocale();
  const nf = new Intl.NumberFormat(locale);
  const system = useAdminSystem();

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader title={ts('title')} note={ts('intro')} />
      {system.isPending ? (
        <div aria-busy="true" className="bg-mist rounded-media h-64" />
      ) : system.isError ? (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p>{t('common.loadFailed')}</p>
          <Button variant="ghost" onClick={() => void system.refetch()}>
            {t('common.retry')}
          </Button>
        </div>
      ) : (
        <>
          <div className="grid gap-5 lg:grid-cols-3">
            <Panel title={ts('database')}>
              <Light ok={system.data.database.ok} label={system.data.database.ok ? ts('ok') : ts('down')} />
              <p className="text-ink/75 text-sm">{ts('latency', { ms: system.data.database.latencyMs })}</p>
            </Panel>
            <Panel title={ts('mail')}>
              <p className="font-display text-5xl leading-none font-black tabular-nums">
                {system.data.mail.sent}
                <span className="text-ink/50"> / {system.data.mail.limit}</span>
              </p>
              <div className="bg-ink/10 h-2 overflow-hidden rounded-full" role="presentation">
                <div className="bg-ink h-full rounded-full" style={{ width: `${Math.min(100, (system.data.mail.sent / Math.max(1, system.data.mail.limit)) * 100)}%` }} />
              </div>
              <p className="text-ink/75 text-sm">{ts('mailHint')}</p>
            </Panel>
            <Panel title={ts('timers')}>
              <p className="font-display text-5xl leading-none font-black tabular-nums">{system.data.overdueTimers}</p>
              <Light ok={system.data.overdueTimers === 0} label={system.data.overdueTimers === 0 ? ts('timersOk') : ts('timersBad')} />
            </Panel>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title={ts('providers')}>
              <dl className="divide-ink/10 flex flex-col divide-y text-base">
                {(
                  [
                    [ts('version'), system.data.version],
                    [ts('uptime', { hours: Math.floor(system.data.uptimeSeconds / 3600) }), ''],
                    [ts('storage'), system.data.storage],
                    [ts('payments'), system.data.payments],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4 py-2.5">
                    <dt className="text-ink/75">{label}</dt>
                    <dd className="font-mono text-sm font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
            </Panel>
            <Panel title={ts('records')}>
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {(['users', 'listings', 'bookings', 'messages', 'reviews'] as const).map((key) => (
                  <div key={key}>
                    <dt className="text-ink/70 text-sm font-semibold">{ts(`counts.${key}`)}</dt>
                    <dd className="font-display text-4xl leading-none font-black tabular-nums">{nf.format(system.data.counts[key])}</dd>
                  </div>
                ))}
              </dl>
            </Panel>
          </div>
        </>
      )}

      <Panel title={ts('exports')}>
        <p className="text-ink/75 -mt-2 text-sm">{ts('exportsHint')}</p>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {ADMIN_EXPORTS.map((kind) => (
            <li key={kind}>
              <a
                href={`/api/v1/admin/export/${kind}.csv`}
                download
                className="border-ink rounded-media hover:bg-mist flex items-center justify-between gap-3 border px-4 py-3 font-semibold"
              >
                <span>{ts(`export.${kind}`)}</span>
                <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:2]">
                  <path d="M12 4v11m-4-4 4 4 4-4M5 20h14" />
                </svg>
                <span className="sr-only">{ts('download')}</span>
              </a>
            </li>
          ))}
        </ul>
      </Panel>
      <ServerErrors />
      <DemoListings />
    </div>
  );
}

/** What broke on the server lately (audit 2026-11-16), so nobody has to read Render's logs to know. */
function ServerErrors() {
  const ts = useTranslations('admin.system.errors');
  const errors = useServerErrors();
  const format = useFormatter();
  const items = errors.data?.items ?? [];
  return (
    <Panel title={ts('title')}>
      {errors.isPending ? (
        <div aria-busy="true" className="bg-mist rounded-media h-24" />
      ) : items.length === 0 ? (
        <p className="text-ink/75 text-sm">{ts('none')}</p>
      ) : (
        <ul className="divide-ink/10 m-0 flex list-none flex-col divide-y p-0">
          {items.map((e) => (
            <li key={e.id} className="py-3">
              <details>
                <summary className="flex cursor-pointer flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-mono text-sm font-bold break-all">{e.message}</span>
                  <span className="text-ink/60 text-sm">
                    {e.method} {e.path} · {ts('times', { count: e.count })} · {format.relativeTime(new Date(e.lastAt))}
                  </span>
                </summary>
                <pre className="bg-mist rounded-media mt-2 overflow-x-auto p-3 text-xs leading-relaxed">{e.stack || e.message}</pre>
              </details>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/**
 * Example listings (owner, 2026-11-16): 24 for Latvia, marked "Example" and never rented. Added six at a
 * time (each call stays short), repeated until all are there; removed with their photos in one go.
 */
function DemoListings() {
  const ts = useTranslations('admin.system.demo');
  const client = useApiClient();
  const [state, setState] = useState<{ count: number; total: number } | null>(null);
  const [busy, setBusy] = useState<'add' | 'remove' | null>(null);
  const [problem, setProblem] = useState(false);
  useEffect(() => {
    void unwrap(client.GET('/api/v1/admin/system/demo'))
      .then(setState)
      .catch(() => setProblem(true));
  }, [client]);
  async function add() {
    setBusy('add');
    setProblem(false);
    try {
      for (let i = 0; i < 10; i++) {
        const next = await unwrap(client.POST('/api/v1/admin/system/demo'));
        setState(next);
        if (!next.added || next.count >= next.total) break;
      }
    } catch {
      setProblem(true);
    } finally {
      setBusy(null);
    }
  }
  async function remove() {
    setBusy('remove');
    setProblem(false);
    try {
      await unwrap(client.DELETE('/api/v1/admin/system/demo'));
      setState((s) => ({ count: 0, total: s?.total ?? 24 }));
    } catch {
      setProblem(true);
    } finally {
      setBusy(null);
    }
  }
  return (
    <Panel title={ts('title')}>
      <p className="text-ink/75 text-sm leading-relaxed">{ts('intro')}</p>
      <p className="text-base font-bold" role="status">
        {state ? ts('count', { count: state.count, total: state.total }) : '…'}
      </p>
      {problem && <p role="alert" className="text-sm text-[var(--danger)]">{ts('failed')}</p>}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void add()} loading={busy === 'add'} disabled={busy !== null || (state !== null && state.count >= state.total)}>
          {ts('add')}
        </Button>
        <Button variant="ghost" onClick={() => void remove()} loading={busy === 'remove'} disabled={busy !== null || state?.count === 0}>
          {ts('remove')}
        </Button>
      </div>
    </Panel>
  );
}
