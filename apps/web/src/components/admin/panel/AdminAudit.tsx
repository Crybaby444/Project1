'use client';

import { ADMIN_AUDIT_PAGE_SIZE, AUDIT_ACTIONS, type AuditEntry } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Link } from '@/i18n/navigation';
import { useAdminAudit } from '@/lib/admin/queries';
import { AdminPageHeader, AdminSelect, Pager } from './parts';

/** Where an entry's object lives in the panel or on the site. */
function targetHref(e: AuditEntry): string | null {
  if (!e.targetId) return e.targetType === 'SETTINGS' ? '/admin/settings' : null;
  switch (e.targetType) {
    case 'LISTING':
      return `/listings/${e.targetId}`;
    case 'USER':
      return `/admin/users/${e.targetId}`;
    case 'BOOKING':
      return `/admin/deals/${e.targetId}`;
    case 'REPORT':
      return '/admin/reports?status=RESOLVED';
    default:
      return null;
  }
}

/**
 * The audit log (spec §6): every administrator action, newest first, with who did it, on what, and — one
 * click away — the state before and after. Filter by kind of action.
 */
export function AdminAudit() {
  const t = useTranslations('admin');
  const ta = useTranslations('admin.audit');
  const locale = useLocale();
  const [action, setAction] = useState<string>('');
  const [page, setPage] = useState(1);
  const log = useAdminAudit(action || undefined, page);
  const when = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const pages = Math.max(1, Math.ceil((log.data?.total ?? 0) / ADMIN_AUDIT_PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader title={ta('title')} note={ta('intro')} />
      <div className="self-start">
        <AdminSelect
          label={ta('all')}
          hideLabel
          className="min-w-64"
          value={action}
          onChange={(v) => {
            setAction(v);
            setPage(1);
          }}
          options={[{ value: '', label: ta('all') }, ...AUDIT_ACTIONS.map((a) => ({ value: a, label: ta(`action.${a}`) }))]}
        />
      </div>
      {log.isPending ? (
        <div aria-busy="true" className="bg-mist rounded-media h-64" />
      ) : log.isError ? (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p>{t('common.loadFailed')}</p>
          <Button variant="ghost" onClick={() => void log.refetch()}>
            {t('common.retry')}
          </Button>
        </div>
      ) : log.data.items.length === 0 ? (
        <p className="border-ink/15 rounded-media border px-5 py-10 text-center">{ta('empty')}</p>
      ) : (
        <ol className="border-ink/15 divide-ink/10 rounded-media divide-y border">
          {log.data.items.map((e) => {
            const href = targetHref(e);
            const hasDiff = e.before != null || e.after != null;
            return (
              <li key={e.id} className="flex flex-col gap-1.5 px-4 py-3.5 sm:px-5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className="font-semibold">
                    {ta(`action.${e.action}`)}
                    {e.summary && <span className="text-ink/75 font-normal"> · {e.summary}</span>}
                  </p>
                  <p className="text-ink/70 text-[13px] tabular-nums">
                    {ta('by', { name: e.admin.name || '—' })} · {when.format(new Date(e.createdAt))}
                  </p>
                </div>
                <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
                  {href && (
                    <Link href={href} className="text-sm font-bold underline decoration-1 underline-offset-4">
                      {ta('open')}
                    </Link>
                  )}
                  {hasDiff && (
                    <details className="group text-sm">
                      <summary className="text-ink/75 cursor-pointer font-semibold">
                        {ta('before')} → {ta('after')}
                      </summary>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {(['before', 'after'] as const).map((side) => (
                          <pre key={side} className="bg-mist overflow-x-auto rounded-[12px] px-3 py-2 font-mono text-[12px] whitespace-pre-wrap">
                            <span className="text-ink/60 block font-sans text-[11px] font-bold uppercase">{ta(side)}</span>
                            {e[side] == null ? '—' : JSON.stringify(e[side], null, 2)}
                          </pre>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <Pager page={page} pages={pages} onPage={setPage} />
    </div>
  );
}
