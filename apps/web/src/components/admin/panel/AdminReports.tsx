'use client';

import { ADMIN_REPORTS_PAGE_SIZE, type AdminReport, type ReportStatus } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { TEXTAREA_CLASS } from '@/components/ui/inputs';
import { useToast } from '@/components/ui/Toast';
import { Link, useRouter } from '@/i18n/navigation';
import { useAdminReports, useCloseReport } from '@/lib/admin/queries';
import { AdminEmpty, AdminPageHeader, Pager } from './parts';

const STATUSES: ReportStatus[] = ['OPEN', 'RESOLVED', 'DISMISSED'];

/**
 * The complaints queue (spec §5): open ones oldest first, each with what it is about (a link to the item,
 * the person or the message's words), who sent it and why; closed with a note as resolved or dismissed.
 */
export function AdminReports({ status, page }: { status: ReportStatus; page: number }) {
  const t = useTranslations('admin');
  const router = useRouter();
  const reports = useAdminReports(status, page);
  const go = (next: { status?: ReportStatus; page?: number }) => {
    const s = next.status ?? status;
    const p = next.page ?? 1;
    const params = new URLSearchParams();
    if (s !== 'OPEN') params.set('status', s);
    if (p > 1) params.set('page', String(p));
    const q = params.toString();
    router.replace(q ? `/admin/reports?${q}` : '/admin/reports');
  };
  const pages = Math.max(1, Math.ceil((reports.data?.total ?? 0) / ADMIN_REPORTS_PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader title={t('reports.title')} count={reports.data ? reports.data.total : undefined} />
      <nav
        aria-label={t('reports.title')}
        className="border-ink/15 rounded-pill inline-flex self-start border p-1"
      >
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={status === s}
            onClick={() => go({ status: s })}
            className={`rounded-pill min-h-9 px-4 text-sm font-bold tracking-[0.03em] uppercase ${status === s ? 'bg-ink text-canvas' : ''}`}
          >
            {t(`reports.${s.toLowerCase()}`)}
          </button>
        ))}
      </nav>
      {reports.isPending ? (
        <div aria-busy="true" className="bg-mist rounded-media h-64" />
      ) : reports.isError ? (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p>{t('common.loadFailed')}</p>
          <Button variant="ghost" onClick={() => void reports.refetch()}>
            {t('common.retry')}
          </Button>
        </div>
      ) : reports.data.items.length === 0 ? (
        <AdminEmpty title={t('reports.empty')} />
      ) : (
        <ul className="flex flex-col gap-3">
          {reports.data.items.map((r) => (
            <li key={r.id}>
              <ReportCard report={r} />
            </li>
          ))}
        </ul>
      )}
      <Pager page={page} pages={pages} onPage={(p) => go({ page: p })} />
    </div>
  );
}

function ReportCard({ report: r }: { report: AdminReport }) {
  const t = useTranslations('admin.reports');
  const tr = useTranslations('report.reason');
  const locale = useLocale();
  const toast = useToast();
  const close = useCloseReport();
  const [resolution, setResolution] = useState('');
  const when = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(r.createdAt));
  const subjectHref =
    r.target === 'LISTING' ? `/listings/${r.subject.id}` : r.subject.userId ? `/u/${r.subject.userId}` : null;

  return (
    <article
      className={`rounded-media flex flex-col gap-3 border p-5 ${r.status === 'OPEN' ? 'border-ink' : 'border-ink/15'}`}
    >
      <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
        <span className="bg-ink text-canvas rounded-pill px-2.5 py-0.5">{tr(r.reason)}</span>
        <span className="border-ink/25 rounded-pill border px-2.5 py-0.5">{t(`target.${r.target}`)}</span>
        <span className="text-ink/70 font-semibold">
          {t('from', { name: r.reporter.name })} · {when}
        </span>
      </div>
      <p
        className={`text-lg leading-snug font-semibold [overflow-wrap:anywhere] ${r.target === 'MESSAGE' ? 'border-ink/20 border-l-2 pl-3 font-normal italic' : ''}`}
      >
        {subjectHref && r.target !== 'MESSAGE' ? (
          <Link href={subjectHref} className="underline decoration-1 underline-offset-4">
            {r.subject.label}
          </Link>
        ) : (
          r.subject.label
        )}
      </p>
      {r.note && <p className="text-ink/80 [overflow-wrap:anywhere] whitespace-pre-wrap">{r.note}</p>}
      {r.subject.userId && (
        <Link
          href={`/u/${r.subject.userId}`}
          className="self-start text-sm font-bold underline decoration-1 underline-offset-4"
        >
          {t('viewUser')}
        </Link>
      )}
      {r.status === 'OPEN' ? (
        <div className="border-ink/15 flex flex-col gap-3 border-t pt-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold">{t('resolution')}</span>
            <textarea
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              maxLength={1000}
              className={`${TEXTAREA_CLASS} min-h-20`}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {(['RESOLVED', 'DISMISSED'] as const).map((status) => (
              <Button
                key={status}
                variant={status === 'RESOLVED' ? 'primary' : 'ghost'}
                disabled={resolution.trim().length === 0 || close.isPending}
                onClick={() =>
                  close.mutate(
                    { id: r.id, status, resolution: resolution.trim() },
                    { onSuccess: () => toast.show(t('done')), onError: () => toast.show(t('failed')) },
                  )
                }
              >
                {status === 'RESOLVED' ? t('resolve') : t('dismiss')}
              </Button>
            ))}
          </div>
        </div>
      ) : (
        r.resolution && <p className="bg-mist rounded-tile px-3 py-2 text-sm">{r.resolution}</p>
      )}
    </article>
  );
}
