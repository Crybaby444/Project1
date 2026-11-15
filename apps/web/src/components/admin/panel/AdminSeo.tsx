'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { Link } from '@/i18n/navigation';
import { useAdminSeo } from '@/lib/admin/queries';
import { AdminPageHeader, Panel } from './parts';

/**
 * SEO (owner, 2026-11-15): how the published items will look to search engines and in the catalog —
 * what holds them back (short titles and descriptions, few photos, no district), the items to fix
 * first, and the site-wide checks (sitemap, robots rules, Search Console).
 */
export function AdminSeo() {
  const t = useTranslations('admin.seo');
  const tc = useTranslations('admin.common');
  const seo = useAdminSeo();

  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader title={t('title')} />
      {seo.isPending ? (
        <div aria-busy="true" className="bg-mist rounded-media h-64" />
      ) : seo.isError ? (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p>{tc('loadFailed')}</p>
          <Button variant="ghost" onClick={() => void seo.refetch()}>
            {tc('retry')}
          </Button>
        </div>
      ) : (
        <>
          <dl className="border-ink/15 grid grid-cols-2 border-y">
            <div className="flex flex-col gap-1 py-5 pr-4">
              <dt className="text-ink/70 text-sm font-semibold">{t('published')}</dt>
              <dd className="font-display text-[3rem] leading-none font-black tabular-nums">{seo.data.published}</dd>
            </div>
            <div className="border-ink/15 flex flex-col gap-1 border-l py-5 pl-4">
              <dt className="text-ink/70 text-sm font-semibold">{t('healthy')}</dt>
              <dd className="font-display text-[3rem] leading-none font-black tabular-nums">
                {seo.data.published > 0 ? Math.round((seo.data.healthy / seo.data.published) * 100) : 100}%
              </dd>
            </div>
          </dl>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <Panel title={t('issues')}>
              {seo.data.issues.length === 0 ? (
                <p>{t('allGood')}</p>
              ) : (
                <ul className="divide-ink/10 flex flex-col divide-y">
                  {seo.data.issues.map((i) => (
                    <li key={i.key} className="flex items-baseline justify-between gap-4 py-2.5 text-[15px]">
                      <span>{t(`issue.${i.key}`)}</span>
                      <span className="font-bold tabular-nums">{i.value}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel title={t('worst')}>
              <ul className="divide-ink/10 flex flex-col divide-y">
                {seo.data.listings
                  .filter((l) => l.issues.length > 0)
                  .slice(0, 15)
                  .map((l) => (
                    <li key={l.id} className="flex items-start gap-4 py-3">
                      <span
                        className={`font-display grid size-12 shrink-0 place-items-center rounded-full text-[1.3rem] font-black tabular-nums ${l.score >= 80 ? 'border-ink/20 border' : 'bg-ink text-canvas'}`}
                        aria-label={`${t('score')}: ${l.score}`}
                      >
                        {l.score}
                      </span>
                      <span className="min-w-0 flex-1">
                        <Link href={`/listings/${l.id}`} className="block truncate font-semibold underline decoration-1 underline-offset-2">
                          {l.title || '—'}
                        </Link>
                        <span className="text-ink/75 block text-sm">{l.issues.map((i) => t(`issue.${i}`)).join(' · ')}</span>
                      </span>
                    </li>
                  ))}
                {seo.data.listings.every((l) => l.issues.length === 0) && <li className="py-3">{t('allGood')}</li>}
              </ul>
            </Panel>
          </div>
        </>
      )}

      <Panel title={t('checks')}>
        <ul className="divide-ink/10 flex flex-col divide-y">
          {(
            [
              ['sitemap', '/sitemap.xml'],
              ['robots', '/robots.txt'],
            ] as const
          ).map(([key, href]) => (
            <li key={key} className="flex items-center justify-between gap-4 py-3">
              <span className="font-semibold">{t(key)}</span>
              <a href={href} target="_blank" rel="noreferrer" className="font-mono text-sm underline decoration-1 underline-offset-2">
                {href}
              </a>
            </li>
          ))}
          <li className="flex flex-col gap-1 py-3">
            <a href="https://search.google.com/search-console" target="_blank" rel="noreferrer" className="font-semibold underline decoration-1 underline-offset-2">
              {t('console')}
            </a>
            <span className="text-ink/75 text-sm">{t('consoleHint')}</span>
          </li>
        </ul>
      </Panel>
    </div>
  );
}
