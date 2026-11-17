'use client';

import type { AdminActivity, AdminOverview as Overview } from '@yoyo/shared';
import { useLocale, useNow, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { Link } from '@/i18n/navigation';
import { useAdminOverview } from '@/lib/admin/queries';
import { useMoney } from '@/lib/deals/money';
import { useSession } from '@/lib/session/SessionProvider';

/**
 * The admin panel's first screen: what waits for a decision first (each a way in), then the size of the
 * marketplace, the last 14 days, the money the platform holds with the ledger audit, and the newest
 * activity. Numbers only, no decoration that does not say something.
 */
export function AdminOverview() {
  const t = useTranslations('admin');
  const overview = useAdminOverview();
  const { user } = useSession();
  const locale = useLocale();
  const now = useNow({ updateInterval: 60_000 });
  const today = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(now);

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-1">
        <p className="text-ink/70 text-sm font-semibold first-letter:uppercase">{today}</p>
        <h1 className="font-display text-display-l leading-[0.92] font-black uppercase">{t('overview.title')}</h1>
        {user && <p className="text-ink/75">{t('overview.hello', { name: user.name.split(' ')[0] ?? user.name })}</p>}
      </header>

      {overview.isPending ? (
        <div aria-busy="true" className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-mist rounded-media h-36" />
          ))}
        </div>
      ) : overview.isError ? (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p>{t('common.loadFailed')}</p>
          <Button variant="ghost" onClick={() => void overview.refetch()}>
            {t('common.retry')}
          </Button>
        </div>
      ) : (
        <Body data={overview.data} />
      )}
    </div>
  );
}

function Body({ data }: { data: Overview }) {
  const t = useTranslations('admin.overview');
  const money = useMoney();
  const waits = [
    { count: data.listings.pendingReview, label: t('toReview', { count: data.listings.pendingReview }), href: '/admin/listings' },
    { count: data.deals.disputed, label: t('disputes', { count: data.deals.disputed }), href: '/admin/deals?view=disputes' },
    // `?.`: an API one release behind has no complaints yet (the site may deploy first).
    { count: data.reports?.open ?? 0, label: t('reportsWaiting', { count: data.reports?.open ?? 0 }), href: '/admin/reports' },
    { count: data.deals.requested, label: t('requests', { count: data.deals.requested }), href: '/admin/deals?status=REQUESTED' },
  ];
  const anything = waits.some((w) => w.count > 0);

  return (
    <>
      <section aria-labelledby="admin-waiting" className="flex flex-col gap-4">
        <h2 id="admin-waiting" className="text-ink/70 text-sm font-bold tracking-[0.04em] uppercase">
          {t('waiting')}
        </h2>
        {anything ? (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {waits.map((w) => (
              <li key={w.href}>
                <Link
                  href={w.href}
                  className={`group rounded-media ease-yoyo flex h-full items-center gap-4 border p-4 transition-transform duration-200 hover:-translate-y-0.5 sm:flex-col sm:items-stretch sm:justify-between sm:gap-6 sm:p-5 ${
                    w.count > 0 ? 'bg-ink text-canvas border-ink' : 'border-ink/15 text-ink/70'
                  }`}
                >
                  <span className="sr-only">{`${w.count} ${w.label}`}</span>
                  <span aria-hidden="true" className="font-display min-w-[2ch] text-display-l leading-[0.8] font-black tabular-nums">
                    {w.count}
                  </span>
                  <span aria-hidden="true" className="flex flex-1 items-center justify-between gap-3 sm:items-end">
                    <span className="text-base leading-snug font-semibold">{w.label}</span>
                    <span className="ease-yoyo text-lg transition-transform duration-200 group-hover:translate-x-1">→</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="border-ink/15 rounded-media flex items-center gap-3 border px-5 py-4 font-semibold">
            <span aria-hidden="true" className="bg-ink inline-block size-2 rounded-full" />
            {t('allClear')}
          </p>
        )}
      </section>

      <dl className="border-ink/15 grid grid-cols-2 border-y lg:grid-cols-4">
        <Stat label={t('users')} value={String(data.users.total)} notes={[t('newWeek', { count: data.users.new7d }), ...(data.users.blocked ? [t('blocked', { count: data.users.blocked })] : [])]} />
        <Stat label={t('listings')} value={String(data.listings.total)} notes={[t('published', { count: data.listings.published })]} />
        <Stat label={t('deals')} value={String(data.deals.open)} notes={[t('completed', { count: data.deals.completed30d })]} />
        <Stat label={t('turnover')} value={money(data.money.turnover30dCents)} notes={[t('turnoverHint')]} />
      </dl>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Chart series={data.series} />
        <section aria-labelledby="admin-money" className="border-ink/15 rounded-media flex flex-col gap-5 border p-5 sm:p-6">
          <h2 id="admin-money" className="text-ink/70 text-sm font-bold tracking-[0.04em] uppercase">
            {t('money')}
          </h2>
          <div>
            <p className="text-ink/70 text-sm font-semibold">{t('revenue')}</p>
            <p className="font-display text-display-m leading-none font-black tabular-nums">{money(data.money.revenueCents)}</p>
          </div>
          <dl className="divide-ink/10 flex flex-col divide-y text-base">
            {(
              [
                ['escrow', data.money.escrowCents],
                ['deposits', data.money.depositsCents],
                ['wallets', data.money.walletsCents],
              ] as const
            ).map(([key, value]) => (
              <div key={key} className="flex items-baseline justify-between gap-4 py-2.5">
                <dt className="text-ink/75">{t(key)}</dt>
                <dd className="font-semibold tabular-nums">{money(value)}</dd>
              </div>
            ))}
          </dl>
          {data.ledgerOk ? (
            <p className="mt-auto flex items-center gap-2 text-sm font-semibold">
              <span aria-hidden="true" className="bg-ink inline-block size-2 rounded-full" />
              {t('ledgerOk')}
            </p>
          ) : (
            <Link href="/admin/money" className="bg-ink text-canvas rounded-media mt-auto flex items-center justify-between gap-3 px-4 py-3 text-sm font-bold">
              <span>{t('ledgerBad')}</span>
              <span aria-hidden="true">→</span>
            </Link>
          )}
        </section>
      </div>

      <Activity items={data.activity} />
    </>
  );
}

function Stat({ label, value, notes }: { label: string; value: string; notes: string[] }) {
  return (
    <div className="border-ink/15 flex flex-col gap-1 px-1 py-5 odd:pr-4 even:border-l even:pl-4 lg:border-l lg:px-5 lg:first:border-l-0 lg:first:pl-1">
      <dt className="text-ink/70 text-sm font-semibold">{label}</dt>
      <dd className="font-display text-display-m leading-none font-black tabular-nums">{value}</dd>
      {notes.map((note) => (
        <dd key={note} className="text-ink/70 text-sm">
          {note}
        </dd>
      ))}
    </div>
  );
}

/** Two bars a day: new deals (ink) and new users (outline), on one scale. */
function Chart({ series }: { series: Overview['series'] }) {
  const t = useTranslations('admin.overview');
  const locale = useLocale();
  const max = Math.max(1, ...series.flatMap((d) => [d.users, d.deals]));
  const users = series.reduce((a, d) => a + d.users, 0);
  const deals = series.reduce((a, d) => a + d.deals, 0);
  const label = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'numeric', timeZone: 'UTC' });
  const H = 140;
  const slot = 100 / series.length;

  return (
    <section aria-labelledby="admin-chart" className="border-ink/15 rounded-media flex flex-col gap-4 border p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="admin-chart" className="text-ink/70 text-sm font-bold tracking-[0.04em] uppercase">
          {t('chart')}
        </h2>
        <ul className="flex gap-4 text-sm font-semibold">
          <li className="flex items-center gap-2">
            <span aria-hidden="true" className="bg-ink inline-block size-2.5 rounded-[3px]" />
            {t('chartDeals')} · {deals}
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden="true" className="border-ink inline-block size-2.5 rounded-[3px] border-[1.5px]" />
            {t('chartUsers')} · {users}
          </li>
        </ul>
      </div>
      <figure className="m-0">
        <svg viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" role="img" aria-label={t('chartSummary', { users, deals })} className="h-44 w-full overflow-visible">
          {[0.5, 1].map((f) => (
            <line key={f} x1="0" x2="100" y1={H - H * f * 0.92} y2={H - H * f * 0.92} stroke="currentColor" strokeOpacity="0.1" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          ))}
          <line x1="0" x2="100" y1={H} y2={H} stroke="currentColor" strokeOpacity="0.25" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          {series.map((d, i) => {
            const x = i * slot + slot * 0.18;
            const w = slot * 0.3;
            const hd = (d.deals / max) * H * 0.92;
            const hu = (d.users / max) * H * 0.92;
            return (
              <g key={d.day}>
                <rect x={x} y={H - hd} width={w} height={hd} rx="0.6" className="fill-ink" />
                <rect x={x + w + slot * 0.04} y={H - hu} width={w} height={hu} rx="0.6" fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
              </g>
            );
          })}
        </svg>
        <figcaption className="text-ink/70 mt-2 grid text-xs tabular-nums" style={{ gridTemplateColumns: `repeat(${series.length}, minmax(0, 1fr))` }}>
          {series.map((d, i) => (
            <span key={d.day} className={`text-center ${i % 2 ? 'max-sm:invisible' : ''}`}>
              {label.format(new Date(`${d.day}T00:00:00Z`))}
            </span>
          ))}
        </figcaption>
      </figure>
    </section>
  );
}

function activityHref(a: AdminActivity): string {
  switch (a.kind) {
    case 'USER_JOINED':
      return `/admin/users?search=${encodeURIComponent(a.title)}`;
    case 'LISTING_SUBMITTED':
      return '/admin/listings';
    default:
      return `/admin/deals/${a.id}`;
  }
}

function Activity({ items }: { items: AdminActivity[] }) {
  const t = useTranslations('admin.overview');
  const locale = useLocale();
  const now = useNow({ updateInterval: 60_000 });
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const ago = (iso: string) => {
    const minutes = Math.round((new Date(iso).getTime() - now.getTime()) / 60_000);
    if (Math.abs(minutes) < 60) return rtf.format(minutes, 'minute');
    const hours = Math.round(minutes / 60);
    if (Math.abs(hours) < 24) return rtf.format(hours, 'hour');
    return rtf.format(Math.round(hours / 24), 'day');
  };

  return (
    <section aria-labelledby="admin-activity" className="flex flex-col gap-3">
      <h2 id="admin-activity" className="text-ink/70 text-sm font-bold tracking-[0.04em] uppercase">
        {t('activity')}
      </h2>
      {items.length === 0 ? (
        <p className="text-ink/75">{t('noActivity')}</p>
      ) : (
        <ol className="divide-ink/10 border-ink/15 divide-y border-y">
          {items.map((a) => (
            <li key={`${a.kind}-${a.id}-${a.at}`} className="flex items-baseline gap-4 py-3">
              <span aria-hidden="true" className={`mt-1.5 inline-block size-2 shrink-0 self-start rounded-full ${a.kind === 'DISPUTE_OPENED' ? 'bg-ink' : 'border-ink border-[1.5px]'}`} />
              <Link href={activityHref(a)} className="min-w-0 flex-1 truncate font-semibold hover:underline hover:decoration-1 hover:underline-offset-2">
                {t(`kind.${a.kind}`, { who: a.who, title: a.title })}
              </Link>
              <time dateTime={a.at} className="text-ink/70 shrink-0 text-sm tabular-nums">
                {ago(a.at)}
              </time>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
