'use client';

import type { AdminAnalytics } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useAdminAnalytics } from '@/lib/admin/queries';
import { AdminPageHeader, Panel } from './parts';

type Row = AdminAnalytics['pages'][number];

/**
 * Traffic (owner, 2026-11-15): the site's own cookieless counters over 7, 30 or 90 days — views and
 * visits by day, the pages people open, where they come from, devices and languages, what they search
 * (and what found nothing: demand to bring owners for), and the way from viewing an item to renting.
 */
export function AdminTraffic() {
  const t = useTranslations('admin.traffic');
  const tc = useTranslations('admin.common');
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const data = useAdminAnalytics(days);

  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader
        title={t('title')}
        action={
          <div role="group" aria-label={t('period')} className="border-ink/15 rounded-pill inline-flex border p-1">
            {([7, 30, 90] as const).map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={days === d}
                onClick={() => setDays(d)}
                className={`rounded-pill min-h-9 px-4 text-sm font-bold tabular-nums ${days === d ? 'bg-ink text-canvas' : ''}`}
              >
                {t('days', { days: d })}
              </button>
            ))}
          </div>
        }
      />
      {data.isPending ? (
        <div aria-busy="true" className="bg-mist rounded-media h-80" />
      ) : data.isError ? (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p>{tc('loadFailed')}</p>
          <Button variant="ghost" onClick={() => void data.refetch()}>
            {tc('retry')}
          </Button>
        </div>
      ) : (
        <Body a={data.data} />
      )}
      <p className="text-ink/70 max-w-read text-sm">{t('privacy')}</p>
    </div>
  );
}

function Body({ a }: { a: AdminAnalytics }) {
  const t = useTranslations('admin.traffic');
  const locale = useLocale();
  const nf = new Intl.NumberFormat(locale);
  const perVisit = a.totals.visits > 0 ? (a.totals.views / a.totals.visits).toFixed(1) : '0';
  const rate = (n: number) => (a.funnel.itemViews > 0 ? Math.round((n / a.funnel.itemViews) * 1000) / 10 : 0);

  return (
    <>
      <dl className="border-ink/15 grid grid-cols-2 border-y lg:grid-cols-4">
        <Big label={t('views')} value={nf.format(a.totals.views)} />
        <Big label={t('visits')} value={nf.format(a.totals.visits)} note={t('perVisit', { count: perVisit })} />
        <Big label={t('requests')} value={nf.format(a.funnel.requests)} note={t('rate', { rate: rate(a.funnel.requests) })} />
        <Big label={t('signups')} value={nf.format(a.funnel.signups)} />
      </dl>

      <Panel title={t('chart')}>
        <Series series={a.series} />
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title={t('pages')}>
          <Bars rows={a.pages} name={(key) => (t.has(`pageNames.${key}`) ? t(`pageNames.${key}`) : null)} />
        </Panel>
        <Panel title={t('sources')}>
          <Bars rows={a.sources.map((r) => (r.key === '(direct)' ? { ...r, key: t('direct') } : r))} />
        </Panel>
        <Panel title={t('searches')}>
          <Bars rows={a.searches} />
        </Panel>
        <Panel title={t('empty')}>
          <p className="text-ink/75 -mt-2 text-sm">{t('emptyHint')}</p>
          <Bars rows={a.emptySearches} />
        </Panel>
        <Panel title={t('devices')}>
          <Bars rows={a.devices.map((r) => ({ ...r, key: t.has(`device.${r.key}`) ? t(`device.${r.key}`) : r.key }))} />
        </Panel>
        <Panel title={t('locales')}>
          <Bars rows={a.locales.map((r) => ({ ...r, key: r.key.toUpperCase() }))} />
        </Panel>
      </div>

      <Panel title={t('funnel')}>
        <ol className="grid gap-3 sm:grid-cols-3">
          {(
            [
              ['itemViews', a.funnel.itemViews, null],
              ['requests', a.funnel.requests, rate(a.funnel.requests)],
              ['signups', a.funnel.signups, null],
            ] as const
          ).map(([key, value, r], i) => (
            <li key={key} className={`rounded-media flex flex-col gap-1 p-4 ${i === 0 ? 'bg-ink text-canvas' : 'border-ink/15 border'}`}>
              <span className="text-sm font-semibold opacity-80">{t(key)}</span>
              <span className="font-display text-5xl leading-none font-black tabular-nums">{nf.format(value)}</span>
              {r !== null && <span className="text-sm opacity-80">{t('rate', { rate: r })}</span>}
            </li>
          ))}
        </ol>
      </Panel>
    </>
  );
}

function Big({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="border-ink/15 flex flex-col gap-1 py-5 pr-4 even:border-l even:pl-4 lg:border-l lg:px-5 lg:first:border-l-0 lg:first:pl-0">
      <dt className="text-ink/70 text-sm font-semibold">{label}</dt>
      <dd className="font-display text-display-m leading-none font-black tabular-nums">{value}</dd>
      {note && <dd className="text-ink/70 text-sm">{note}</dd>}
    </div>
  );
}

/** A ranked list with a bar each, as long as its share of the largest. */
function Bars({ rows, name }: { rows: Row[]; name?: (key: string) => string | null }) {
  const t = useTranslations('admin.traffic');
  if (rows.length === 0) return <p className="text-ink/70 text-sm">{t('none')}</p>;
  const max = Math.max(...rows.map((r) => r.value));
  return (
    <ol className="flex flex-col gap-2">
      {rows.map((r) => (
        <li key={r.key} className="relative overflow-hidden rounded-[10px] px-3 py-2">
          <span aria-hidden="true" className="bg-ink/[0.07] absolute inset-y-0 left-0 rounded-[10px]" style={{ width: `${Math.max(4, (r.value / max) * 100)}%` }} />
          <span className="relative flex items-baseline justify-between gap-3 text-base">
            <span className="min-w-0 truncate">
              {name?.(r.key) ? (
                <>
                  <span className="font-semibold">{name(r.key)}</span> <span className="text-ink/60 font-mono text-xs">{r.key}</span>
                </>
              ) : (
                <span className="font-mono text-sm">{r.key}</span>
              )}
            </span>
            <span className="shrink-0 font-semibold tabular-nums">{r.value}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Views (ink bars) with visits (a line) on one scale. */
function Series({ series }: { series: AdminAnalytics['series'] }) {
  const t = useTranslations('admin.traffic');
  const locale = useLocale();
  const max = Math.max(1, ...series.map((d) => d.views));
  const H = 160;
  const w = 100 / series.length;
  const label = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'numeric', timeZone: 'UTC' });
  const points = series.map((d, i) => `${i * w + w / 2},${H - (d.visits / max) * H * 0.92}`).join(' ');
  const every = Math.ceil(series.length / 8);
  const views = series.reduce((a, d) => a + d.views, 0);
  const visits = series.reduce((a, d) => a + d.visits, 0);
  return (
    <figure className="m-0">
      <svg viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" role="img" aria-label={`${t('views')}: ${views}. ${t('visits')}: ${visits}.`} className="h-48 w-full overflow-visible">
        <line x1="0" x2="100" y1={H} y2={H} stroke="currentColor" strokeOpacity="0.25" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        {series.map((d, i) => {
          const h = (d.views / max) * H * 0.92;
          return <rect key={d.day} x={i * w + w * 0.18} y={H - h} width={w * 0.64} height={h} rx="0.5" className="fill-ink/80" />;
        })}
        <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
      </svg>
      <figcaption className="text-ink/70 mt-2 grid text-xs tabular-nums" style={{ gridTemplateColumns: `repeat(${series.length}, minmax(0, 1fr))` }}>
        {series.map((d, i) => (
          <span key={d.day} className={`text-center ${i % every ? 'invisible' : ''}`}>
            {label.format(new Date(`${d.day}T00:00:00Z`))}
          </span>
        ))}
      </figcaption>
      <p className="mt-3 flex gap-4 text-sm font-semibold">
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="bg-ink/80 inline-block size-2.5 rounded-[3px]" />
          {t('views')}
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="border-ink inline-block w-4 border-t-2 border-dashed" />
          {t('visits')}
        </span>
      </p>
    </figure>
  );
}
