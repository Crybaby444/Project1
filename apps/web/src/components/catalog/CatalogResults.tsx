import { CATALOG_PAGE_SIZE, type CategoryNode, type Locale } from '@yoyo/shared';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { catalogSearch, type CatalogParams, toApiQuery } from '@/lib/catalog/params';
import { loadMap, loadPlaces, loadSearch } from '@/lib/catalog/server-api';
import { displayFit } from '@/lib/display-fit';
import { addDays, todayIn } from '@/lib/listings/calendar';
import { ActiveFilters } from './ActiveFilters';
import { Breadcrumbs, type Crumb } from './Breadcrumbs';
import { CatalogMapLoader } from './CatalogMapLoader';
import { CatalogShell, ResultsRegion } from './CatalogShell';
import { EmptyResults } from './EmptyResults';
import { Filters } from './Filters';
import { ListingCard } from './ListingCard';
import { Pagination } from './Pagination';
import { SearchBox } from './SearchBox';
import { Toolbar } from './Toolbar';

/** Rentals start at most this far ahead by default (the deal settings may say less; the API decides). */
const DATES_AHEAD = 365;

/**
 * Dates from an old link that are already past (or too far ahead) are dropped instead of answered with
 * an error: a shared link keeps working, only less narrowed.
 */
export function usableParams(params: CatalogParams, today: string): CatalogParams {
  if (params.from && (params.from < today || params.from > addDays(today, DATES_AHEAD))) {
    const rest = { ...params };
    delete rest.from;
    delete rest.to;
    return rest;
  }
  return params;
}

type Props = {
  locale: Locale;
  params: CatalogParams;
  /** The page's category, or none for search. */
  category: CategoryNode | null;
  /** Links next to the title: subcategories of a root, sibling subcategories of a leaf. */
  related: { label: string; href: string; current: boolean }[];
  /** The page's path without the locale and query (`/c/instrumenti`, `/search`). */
  path: string;
  title: string;
  crumbs: Crumb[];
  children?: ReactNode;
};

/** Search and category pages: one layout (W03 §B), the results drawn on the server. */
export async function CatalogResults({ params: raw, category, related, path, title, crumbs }: Props) {
  const t = await getTranslations('catalog');
  const today = todayIn('Europe/Riga');
  const params = usableParams(raw, today);
  const query = toApiQuery(params, category?.slug);
  const [results, places, map] = await Promise.all([
    loadSearch(query),
    loadPlaces(),
    params.view === 'map' ? loadMap({ ...query, page: 1 }) : Promise.resolve(null),
  ]);

  if (!results.ok) {
    return (
      <main className="mx-auto flex w-full max-w-[1440px] flex-col items-center gap-4 px-4 py-20 text-center sm:px-8">
        <h1 className="text-3xl font-bold">{t('error.title')}</h1>
        <p className="max-w-[46ch]">{t('error.body')}</p>
        <Link href={`${path}${catalogSearch(params)}`} className="bg-cta text-cta-fg border-cta rounded-pill inline-flex min-h-10 items-center border px-5 text-[13px] font-bold tracking-[0.03em] uppercase">
          {t('error.retry')}
        </Link>
      </main>
    );
  }

  const { items, total } = results.data;
  const pages = Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE));
  const districts = places.ok ? places.data.districts : [];
  const status = t('found', { count: total });

  return (
    <CatalogShell>
      <main className="@container mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-8 sm:px-8 sm:py-10">
        <Breadcrumbs items={crumbs} label={t('breadcrumbs.label')} />
        <div className="flex flex-col gap-4">
          <h1 style={displayFit(title, { min: '1.75rem', max: '3.5rem' })} className="font-display text-display-fit leading-[0.9] font-black uppercase">
            {title}
          </h1>
          <SearchBox initialQuery={params.q ?? ''} className="max-w-3xl" />
          {related.length > 0 && (
            <nav aria-label={t('related')}>
              <ul className="flex flex-wrap gap-2">
                {related.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={link.current ? 'page' : undefined}
                      className={`rounded-pill ease-yoyo inline-flex min-h-10 items-center border px-4 text-sm font-bold transition-transform duration-250 active:scale-95 ${link.current ? 'bg-cta text-cta-fg border-cta' : 'border-ink hover:bg-mist bg-transparent'}`}
                    >
                      <span className="[overflow-wrap:anywhere]">{link.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="flex flex-col gap-4">
            <Filters params={params} districts={districts} today={today} total={total} />
          </aside>
          <div className="flex min-w-0 flex-col gap-5">
            <Toolbar params={params} />
            <ActiveFilters params={params} districts={districts} />
            <ResultsRegion status={status}>
              <div className="flex flex-col gap-6">
                {params.view === 'map' && map?.ok && <CatalogMapLoader pins={map.data.pins} truncated={map.data.truncated} />}
                {items.length === 0 ? (
                  <EmptyResults params={params} resetHref={params.q ? `${path}?q=${encodeURIComponent(params.q)}` : path} />
                ) : (
                  <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {items.map((item, index) => (
                      <li key={item.id}>
                        <ListingCard item={item} eager={index < 3} />
                      </li>
                    ))}
                  </ul>
                )}
                <Pagination
                  page={params.page}
                  pages={pages}
                  hrefFor={(page) => `${path}${catalogSearch(params, { page })}`}
                  labels={{ nav: t('pagination.label'), previous: t('pagination.previous'), next: t('pagination.next'), status: t('pagination.status', { page: params.page, pages }) }}
                />
              </div>
            </ResultsRegion>
          </div>
        </div>
      </main>
    </CatalogShell>
  );
}
