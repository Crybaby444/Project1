'use client';

import type { AdminActivity, AdminOverview as Overview } from '@yoyo/shared';
import { useLocale, useNow, useTranslations } from 'next-intl';
import { useId, useState, type CSSProperties, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Link } from '@/i18n/navigation';
import { useAdminOverview } from '@/lib/admin/queries';
import { useMoney } from '@/lib/deals/money';
import { useSession } from '@/lib/session/SessionProvider';
import { CountUp, StatCard } from './parts';

/** The place of a block in the arrival order: it comes out of a blur after the ones before it. */
const rise = (i: number) => ({ style: { '--i': i } as CSSProperties });

/**
 * The admin panel's first screen (owner, 2026-11-26: "how the information reads, and the motion"): what
 * waits for a decision first, then the size of the marketplace with its last two weeks drawn small, the
 * 14 days large (today lit), the money the platform holds as one bar, and the newest events by day.
 * Every figure counts up as it arrives; every block comes out of a blur in turn.
 */
export function AdminOverview() {
  const t = useTranslations('admin');
  const overview = useAdminOverview();
  const { user } = useSession();
  const locale = useLocale();
  const now = useNow({ updateInterval: 60_000 });
  const today = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(
    now,
  );

  return (
    <div className="flex flex-col gap-10">
      {/* The title leads; the day and the greeting are its line underneath (DESIGN.md: no kicker above a heading). */}
      <header {...rise(0)} className="admin-rise flex flex-col gap-2">
        <h1 className="type-title">{t('overview.title')}</h1>
        <p className="text-ink/75">
          <span className="inline-block first-letter:uppercase">{today}</span>
          {user && <> · {t('overview.hello', { name: user.name.split(' ')[0] ?? user.name })}</>}
        </p>
      </header>

      {overview.isPending ? (
        <div aria-busy="true" className="grid gap-4 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-mist rounded-media h-36 animate-pulse" />
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

/** The last 7 days against the 7 before them. */
function week(values: number[]) {
  const last = values.slice(-7).reduce((a, b) => a + b, 0);
  const before = values.slice(-14, -7).reduce((a, b) => a + b, 0);
  return { last, delta: last - before };
}

function Body({ data }: { data: Overview }) {
  const t = useTranslations('admin.overview');
  const money = useMoney();
  const waits = [
    {
      count: data.listings.pendingReview,
      label: t('toReview', { count: data.listings.pendingReview }),
      href: '/admin/listings',
    },
    {
      count: data.deals.disputed,
      label: t('disputes', { count: data.deals.disputed }),
      href: '/admin/deals?view=disputes',
    },
    // `?.`: an API one release behind has no complaints yet (the site may deploy first).
    {
      count: data.reports?.open ?? 0,
      label: t('reportsWaiting', { count: data.reports?.open ?? 0 }),
      href: '/admin/reports',
    },
    {
      count: data.deals.requested,
      label: t('requests', { count: data.deals.requested }),
      href: '/admin/deals?status=REQUESTED',
    },
  ];
  const anything = waits.some((w) => w.count > 0);
  const users = data.series.map((d) => d.users);
  const deals = data.series.map((d) => d.deals);

  return (
    <>
      <section {...rise(1)} aria-labelledby="admin-waiting" className="admin-rise flex flex-col gap-4">
        <h2 id="admin-waiting" className="text-ink/70 type-label">
          {t('waiting')}
        </h2>
        {anything ? (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {waits.map((w) => (
              <li key={w.href}>
                <Link
                  href={w.href}
                  className={`group rounded-media ease-yoyo relative flex h-full items-center gap-4 border p-4 transition-[transform,border-color] duration-200 hover:-translate-y-0.5 sm:flex-col sm:items-stretch sm:justify-between sm:gap-6 sm:p-5 ${
                    w.count > 0
                      ? 'admin-glass border-ink/25 hover:border-ink/45'
                      : 'border-ink/10 text-ink/55'
                  }`}
                >
                  <span className="sr-only">{`${w.count} ${w.label}`}</span>
                  {w.count > 0 && (
                    // A lit dot: this one waits for you.
                    <span aria-hidden="true" className="absolute top-4 right-4 flex size-2.5">
                      <span className="absolute inset-0 animate-ping rounded-full bg-[rgb(var(--admin-light))] opacity-60 motion-reduce:hidden" />
                      <span className="relative size-2.5 rounded-full bg-[rgb(var(--admin-light))]" />
                    </span>
                  )}
                  <span
                    aria-hidden="true"
                    className="font-display text-display-l min-w-[2ch] leading-[0.8] font-black tabular-nums"
                  >
                    <CountUp value={w.count} />
                  </span>
                  <span
                    aria-hidden="true"
                    className="flex flex-1 items-center justify-between gap-3 sm:items-end"
                  >
                    <span className="text-base leading-snug font-semibold">{w.label}</span>
                    <span className="ease-yoyo text-lg transition-transform duration-200 group-hover:translate-x-1">
                      →
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="admin-glass border-ink/15 rounded-media flex items-center gap-3 border px-5 py-4 font-semibold">
            <span
              aria-hidden="true"
              className="inline-block size-2 rounded-full bg-[rgb(var(--admin-light))]"
            />
            {t('allClear')}
          </p>
        )}
      </section>

      <dl {...rise(2)} className="admin-rise grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t('users')}
          value={<CountUp value={data.users.total} />}
          notes={[
            t('newWeek', { count: data.users.new7d }),
            ...(data.users.blocked ? [t('blocked', { count: data.users.blocked })] : []),
          ]}
        >
          <Trend values={users} />
        </StatCard>
        <StatCard
          label={t('listings')}
          value={<CountUp value={data.listings.total} />}
          notes={[t('published', { count: data.listings.published })]}
        >
          <Share part={data.listings.published} whole={data.listings.total} />
        </StatCard>
        <StatCard
          label={t('deals')}
          value={<CountUp value={data.deals.open} />}
          notes={[t('completed', { count: data.deals.completed30d })]}
        >
          <Trend values={deals} />
        </StatCard>
        <StatCard
          label={t('turnover')}
          value={<CountUp value={data.money.turnover30dCents} format={money} />}
          notes={[t('turnoverHint')]}
        />
      </dl>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div {...rise(3)} className="admin-rise min-w-0">
          <Chart series={data.series} />
        </div>
        <section
          {...rise(4)}
          aria-labelledby="admin-money"
          className="admin-rise admin-glass border-ink/15 rounded-media flex min-w-0 flex-col gap-5 border p-5 sm:p-6"
        >
          <h2 id="admin-money" className="text-ink/70 type-label">
            {t('money')}
          </h2>
          <div>
            <p className="text-ink/70 text-sm font-semibold">{t('revenue')}</p>
            <p className="font-display text-display-m leading-none font-black tabular-nums">
              <CountUp value={data.money.revenueCents} format={money} />
            </p>
          </div>
          <Held
            escrow={data.money.escrowCents}
            deposits={data.money.depositsCents}
            wallets={data.money.walletsCents}
          />
          {data.ledgerOk ? (
            <p className="mt-auto flex items-center gap-2 text-sm font-semibold">
              <span
                aria-hidden="true"
                className="inline-block size-2 rounded-full bg-[rgb(var(--admin-light))]"
              />
              {t('ledgerOk')}
            </p>
          ) : (
            <Link
              href="/admin/money"
              className="bg-ink text-canvas rounded-media mt-auto flex items-center justify-between gap-3 px-4 py-3 text-sm font-bold"
            >
              <span>{t('ledgerBad')}</span>
              <span aria-hidden="true">→</span>
            </Link>
          )}
        </section>
      </div>

      <div {...rise(5)} className="admin-rise">
        <Activity items={data.activity} />
      </div>
    </>
  );
}

/** Two weeks drawn small, and the last week against the one before. */
function Trend({ values }: { values: number[] }) {
  const t = useTranslations('admin.overview');
  const { delta } = week(values);
  const max = Math.max(1, ...values);
  const W = 120;
  const H = 28;
  const step = values.length > 1 ? W / (values.length - 1) : W;
  const points = values
    .map((v, i) => `${(i * step).toFixed(1)},${(H - (v / max) * (H - 4) - 2).toFixed(1)}`)
    .join(' ');
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : '±';
  return (
    <div className="flex flex-col gap-1.5">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        aria-hidden="true"
        className="admin-draw h-7 w-full overflow-visible"
      >
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.55"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {values.length > 0 && (
          <line
            x1={(values.length - 1) * step}
            x2={(values.length - 1) * step}
            y1={H - (values.at(-1)! / max) * (H - 4) - 2}
            y2={H - (values.at(-1)! / max) * (H - 4) - 2}
            stroke="rgb(var(--admin-light))"
            strokeWidth="6"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      <span
        className={`text-xs font-bold whitespace-nowrap tabular-nums ${delta > 0 ? 'text-ink' : 'text-ink/60'}`}
      >
        {t('vsLastWeek', { delta: `${sign}${Math.abs(delta)}` })}
      </span>
    </div>
  );
}

/** How much of the whole is in the catalog, as a filled line. */
function Share({ part, whole }: { part: number; whole: number }) {
  const t = useTranslations('admin.overview');
  const share = whole > 0 ? part / whole : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="bg-ink/10 h-1.5 overflow-hidden rounded-full">
        <div
          className="admin-grow-x h-full rounded-full bg-[rgb(var(--admin-light))]"
          style={{ width: `${Math.round(share * 100)}%` }}
        />
      </div>
      <span className="text-ink/60 text-xs font-bold tabular-nums">
        {t('shareLive', { percent: Math.round(share * 100) })}
      </span>
    </div>
  );
}

/** What the platform holds right now, as one bar of three parts with their sums under it. */
function Held({ escrow, deposits, wallets }: { escrow: number; deposits: number; wallets: number }) {
  const t = useTranslations('admin.overview');
  const money = useMoney();
  const parts = [
    { key: 'escrow', value: escrow, tone: 'bg-ink' },
    { key: 'deposits', value: deposits, tone: 'bg-[rgb(var(--admin-light))]' },
    { key: 'wallets', value: wallets, tone: 'bg-ink/35' },
  ] as const;
  const total = escrow + deposits + wallets;
  return (
    <div className="flex flex-col gap-3">
      <div className="bg-ink/10 flex h-2.5 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
        {total > 0 &&
          parts.map((p) =>
            p.value > 0 ? (
              <div
                key={p.key}
                className={`admin-grow-x h-full ${p.tone}`}
                style={{ width: `${(p.value / total) * 100}%` }}
              />
            ) : null,
          )}
      </div>
      <dl className="flex flex-col gap-2 text-base">
        {parts.map((p) => (
          <div key={p.key} className="flex items-baseline justify-between gap-4">
            <dt className="text-ink/75 flex items-center gap-2">
              <span aria-hidden="true" className={`inline-block size-2 rounded-full ${p.tone}`} />
              {t(p.key)}
            </dt>
            <dd className="font-semibold tabular-nums">{money(p.value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * Two pills a day, new deals (filled) and new users (outlined), grown in from the floor one day after
 * another; today is lit. Pointing at a day (or focusing it) shows its numbers.
 */
function Chart({ series }: { series: Overview['series'] }) {
  const t = useTranslations('admin.overview');
  const locale = useLocale();
  const tipId = useId();
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...series.flatMap((d) => [d.users, d.deals]));
  const users = series.reduce((a, d) => a + d.users, 0);
  const deals = series.reduce((a, d) => a + d.deals, 0);
  const dealsWeek = week(series.map((d) => d.deals));
  const usersWeek = week(series.map((d) => d.users));
  const short = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'numeric', timeZone: 'UTC' });
  const long = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });
  const last = series.length - 1;
  const shown = hover ?? last;
  const day = series[shown];
  // The series counts days in UTC; "today" only when its last day is also the viewer's today.
  const now = useNow({ updateInterval: 60_000 });
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : '±'}${Math.abs(n)}`;

  return (
    <section
      aria-labelledby="admin-chart"
      className="admin-glass border-ink/15 rounded-media flex h-full flex-col gap-5 border p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="admin-chart" className="text-ink/70 type-label">
          {t('chart')}
        </h2>
        <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm font-semibold">
          <li className="flex items-center gap-2">
            <span aria-hidden="true" className="bg-ink inline-block size-2.5 rounded-full" />
            {t('chartDeals')} · {deals}
            <span className="text-ink/55 text-xs tabular-nums">
              {t('vsLastWeek', { delta: signed(dealsWeek.delta) })}
            </span>
          </li>
          <li className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="border-ink inline-block size-2.5 rounded-full border-[1.5px]"
            />
            {t('chartUsers')} · {users}
            <span className="text-ink/55 text-xs tabular-nums">
              {t('vsLastWeek', { delta: signed(usersWeek.delta) })}
            </span>
          </li>
        </ul>
      </div>

      <figure className="m-0 flex flex-col gap-2">
        <p className="sr-only">{t('chartSummary', { users, deals })}</p>
        {/* The day being read: the one pointed at, else today. */}
        {day && (
          <p
            id={tipId}
            aria-live="polite"
            className="text-ink/80 flex min-h-6 flex-wrap items-baseline gap-x-3 text-sm tabular-nums"
          >
            <span className="font-bold first-letter:uppercase">
              {hover === null && day.day === todayKey
                ? t('today')
                : long.format(new Date(`${day.day}T00:00:00Z`))}
            </span>
            <span>
              {t('chartDeals')}: <b>{day.deals}</b>
            </span>
            <span>
              {t('chartUsers')}: <b>{day.users}</b>
            </span>
          </p>
        )}
        <ol className="m-0 flex h-44 list-none items-end gap-[3%] p-0" onMouseLeave={() => setHover(null)}>
          {series.map((d, i) => {
            const lit = i === last;
            const active = i === shown;
            return (
              <li key={d.day} className="flex h-full min-w-0 flex-1 flex-col">
                <button
                  type="button"
                  aria-label={`${long.format(new Date(`${d.day}T00:00:00Z`))}: ${t('chartDeals')} ${d.deals}, ${t('chartUsers')} ${d.users}`}
                  aria-describedby={tipId}
                  onMouseEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  className={`group relative flex h-full w-full items-end justify-center gap-[12%] rounded-tile px-[6%] pb-0 transition-colors duration-150 ${active ? 'bg-ink/[0.06]' : 'hover:bg-ink/[0.04]'}`}
                >
                  <Bar
                    value={d.deals}
                    max={max}
                    index={i}
                    className={
                      lit
                        ? 'bg-[rgb(var(--admin-light))] shadow-[0_0_18px_rgb(var(--admin-light)/0.55)]'
                        : 'bg-ink'
                    }
                  />
                  <Bar
                    value={d.users}
                    max={max}
                    index={i}
                    className={
                      lit ? 'border-[1.5px] border-[rgb(var(--admin-light))]' : 'border-ink/70 border-[1.5px]'
                    }
                  />
                </button>
              </li>
            );
          })}
        </ol>
        <div aria-hidden="true" className="text-ink/60 flex gap-[3%] text-xs tabular-nums">
          {series.map((d, i) => (
            <span
              key={d.day}
              className={`min-w-0 flex-1 text-center ${i === last ? 'text-ink font-bold' : ''} ${(last - i) % 2 ? 'max-sm:invisible' : ''}`}
            >
              {short.format(new Date(`${d.day}T00:00:00Z`))}
            </span>
          ))}
        </div>
      </figure>
    </section>
  );
}

/** One pill of the chart, grown from the floor after the days before it. An empty day keeps a stub. */
function Bar({
  value,
  max,
  index,
  className,
}: {
  value: number;
  max: number;
  index: number;
  className: string;
}) {
  const height = value > 0 ? Math.max(6, (value / max) * 100) : 0;
  return (
    <span
      className={`admin-grow-y block w-full max-w-3 min-w-1 rounded-full ${value > 0 ? className : 'bg-ink/10 h-1'}`}
      style={{ ...(value > 0 && { height: `${height}%` }), '--i': index } as CSSProperties}
    />
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

const KIND_ICON: Record<AdminActivity['kind'], ReactNode> = {
  USER_JOINED: (
    <path d="M15 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 8v6M22 11h-6" />
  ),
  LISTING_SUBMITTED: <path d="M9 12l2 2 4-4M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z" />,
  DEAL_REQUESTED: <path d="M7 7h11l-3-3M17 17H6l3 3" />,
  DISPUTE_OPENED: (
    <path d="M12 9v4M12 17h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
  ),
};

/** The newest events, under a heading per day (today, yesterday, then dates), each with its kind's mark. */
function Activity({ items }: { items: AdminActivity[] }) {
  const t = useTranslations('admin.overview');
  const locale = useLocale();
  const now = useNow({ updateInterval: 60_000 });
  const days = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const date = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' });
  const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' });
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayLabel = (iso: string) => {
    const diff = Math.round((startOf(new Date(iso)) - startOf(now)) / 86_400_000);
    return diff >= -1 ? days.format(diff, 'day') : date.format(new Date(iso));
  };
  const groups: { label: string; items: AdminActivity[] }[] = [];
  for (const a of items) {
    const label = dayLabel(a.at);
    const group = groups.at(-1);
    if (group?.label === label) group.items.push(a);
    else groups.push({ label, items: [a] });
  }

  return (
    <section aria-labelledby="admin-activity" className="flex flex-col gap-3">
      <h2 id="admin-activity" className="text-ink/70 type-label">
        {t('activity')}
      </h2>
      {items.length === 0 ? (
        <p className="text-ink/75">{t('noActivity')}</p>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((g) => (
            <div key={g.label} className="flex flex-col gap-1">
              <h3 className="text-ink/55 type-caption">{g.label}</h3>
              <ol className="divide-ink/10 border-ink/10 m-0 list-none divide-y border-y p-0">
                {g.items.map((a) => (
                  <li key={`${a.kind}-${a.id}-${a.at}`} className="group flex items-center gap-4 py-2.5">
                    <span
                      aria-hidden="true"
                      className={`grid size-8 shrink-0 place-items-center rounded-full border ${a.kind === 'DISPUTE_OPENED' ? 'border-[rgb(var(--admin-light))] text-[rgb(var(--admin-light))]' : 'border-ink/20 text-ink/75'}`}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="size-4 fill-none stroke-current [stroke-width:1.7] [stroke-linecap:round] [stroke-linejoin:round]"
                      >
                        {KIND_ICON[a.kind]}
                      </svg>
                    </span>
                    <Link
                      href={activityHref(a)}
                      className="min-w-0 flex-1 truncate font-semibold hover:underline hover:decoration-1 hover:underline-offset-2"
                    >
                      {t(`kind.${a.kind}`, { who: a.who, title: a.title })}
                    </Link>
                    <time dateTime={a.at} className="text-ink/60 shrink-0 text-sm tabular-nums">
                      {time.format(new Date(a.at))}
                    </time>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
