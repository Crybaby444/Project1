'use client';

import { ADMIN_PAGE_SIZE, BOOKING_STATUSES, type BookingStatus } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { DealStatusBadge } from '@/components/deals/DealStatusBadge';
import { Button } from '@/components/ui/Button';
import { Link, useRouter } from '@/i18n/navigation';
import { useAdminDeals } from '@/lib/admin/queries';
import { formatPeriod } from '@/lib/deals/dates';
import { useMoney } from '@/lib/deals/money';
import { AdminPageHeader, AdminSelect, Pager, TABLE_CLASS, TD, TH } from './parts';

export type DealsView = { disputed: boolean; status?: BookingStatus; page: number };

/**
 * Every deal, 50 a page, newest first; "Disputes" shows those waiting for a decision, the longest
 * waiting first. The filter lives in the address, so a link (from the overview, an email) opens it.
 */
export function AdminDeals({ view }: { view: DealsView }) {
  const t = useTranslations('admin');
  const ts = useTranslations('dealStatus');
  const locale = useLocale();
  const money = useMoney();
  const router = useRouter();
  const deals = useAdminDeals(view);

  const go = (next: Partial<DealsView>) => {
    const merged = { ...view, page: 1, ...next };
    const params = new URLSearchParams();
    if (merged.disputed) params.set('view', 'disputes');
    if (merged.status && !merged.disputed) params.set('status', merged.status);
    if (merged.page > 1) params.set('page', String(merged.page));
    const query = params.toString();
    router.replace(query ? `/admin/deals?${query}` : '/admin/deals');
  };

  const total = deals.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader title={t('deals.title')} note={deals.data ? t('common.total', { count: total }) : undefined} />

      <div className="flex flex-wrap items-center gap-3">
        <nav aria-label={t('deals.filterLabel')} className="border-ink/15 rounded-pill inline-flex border p-1">
          {([false, true] as const).map((disputed) => (
            <button
              key={String(disputed)}
              type="button"
              aria-pressed={view.disputed === disputed}
              onClick={() => go({ disputed, status: undefined })}
              className={`rounded-pill min-h-9 px-4 text-sm font-bold tracking-[0.03em] uppercase ${view.disputed === disputed ? 'bg-ink text-canvas' : 'text-ink'}`}
            >
              {disputed ? t('deals.disputes') : t('deals.all')}
            </button>
          ))}
        </nav>
        {!view.disputed && (
          <AdminSelect
            label={t('deals.status')}
            value={view.status ?? ''}
            onChange={(v) => go({ status: (v || undefined) as BookingStatus | undefined })}
            options={[{ value: '', label: t('deals.anyStatus') }, ...BOOKING_STATUSES.map((s) => ({ value: s, label: ts(s) }))]}
          />
        )}
      </div>

      {deals.isPending ? (
        <div aria-busy="true" className="bg-mist rounded-media h-72" />
      ) : deals.isError ? (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p>{t('common.loadFailed')}</p>
          <Button variant="ghost" onClick={() => void deals.refetch()}>
            {t('common.retry')}
          </Button>
        </div>
      ) : deals.data.items.length === 0 ? (
        <p className="border-ink/15 rounded-media border px-5 py-10 text-center">{t('deals.empty')}</p>
      ) : (
        <div className="border-ink/15 rounded-media relative overflow-x-auto border" tabIndex={0} role="region" aria-label={t('deals.title')}>
          <table className={TABLE_CLASS}>
            <thead>
              <tr>
                <th className={TH}>{t('deals.item')}</th>
                <th className={TH}>{t('deals.status')}</th>
                <th className={TH}>{t('deals.renter')}</th>
                <th className={TH}>{t('deals.owner')}</th>
                <th className={TH}>{t('deals.dates')}</th>
                <th className={`${TH} text-right`}>{t('deals.total')}</th>
              </tr>
            </thead>
            <tbody>
              {deals.data.items.map((d) => (
                <tr key={d.id} className="hover:bg-ink/[0.03]">
                  <td className={`${TD} max-w-[18rem]`}>
                    <Link href={`/admin/deals/${d.id}`} className="block truncate font-semibold underline decoration-1 underline-offset-2">
                      {d.listing.title}
                    </Link>
                  </td>
                  <td className={TD}>
                    <DealStatusBadge status={d.status} />
                  </td>
                  <td className={TD}>{d.renter.name}</td>
                  <td className={TD}>{d.owner.name}</td>
                  <td className={`${TD} whitespace-nowrap tabular-nums`}>{formatPeriod(d.period.start, d.period.end, locale)}</td>
                  <td className={`${TD} text-right font-semibold whitespace-nowrap tabular-nums`}>{money(d.quote.totalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pager page={view.page} pages={pages} onPage={(page) => go({ page })} />
    </div>
  );
}
