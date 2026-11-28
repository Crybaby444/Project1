import { CATALOG_PAGE_SIZE, type CatalogQuery, type CategoryNode, type Locale } from '@yoyo/shared';
import { currentCountry } from '@/lib/country/server';
import { getTranslations } from 'next-intl/server';
import { RentalRules } from './RentalRules';
import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { catalogSearch, type CatalogParams, toApiQuery } from '@/lib/catalog/params';
import { SaveSearchButton } from './SaveSearchButton';
import { daysBetween } from '@/lib/deals/dates';
import { loadPlaces, loadSearch } from '@/lib/catalog/server-api';
import { PageHeader } from '@/components/ui/PageHeader';
import { addDays, todayIn } from '@/lib/listings/calendar';
import { ActiveFilters } from './ActiveFilters';
import { Breadcrumbs, type Crumb } from './Breadcrumbs';
import { CatalogShell, ResultsRegion } from './CatalogShell';
import { EmptyResults } from './EmptyResults';
import { FiltersButton, FiltersRail } from './Filters';
import { ListingCard } from './ListingCard';
import { Pagination } from './Pagination';
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
  /** The root category's slug and this page's name, for the intro and the rules at the foot (category pages). */
  intro?: { root: string; name: string };
  /** Above the items: the people the words also found (the search page). */
  people?: ReactNode;
  children?: ReactNode;
};

/** Search and category pages: one layout (W03 §B), the results drawn on the server. */
export async function CatalogResults({ params: raw, category, related, path, title, crumbs, intro, people }: Props) {
  const t = await getTranslations('catalog');
  const ti = await getTranslations('categoryIntro');
  const lead = intro && ti.has(`roots.${intro.root}`) ? ti(`roots.${intro.root}`) : null;
  const today = todayIn('Europe/Riga');
  const params = usableParams(raw, today);
  const days = params.from && params.to ? daysBetween(params.from, params.to) : undefined;
  const query = toApiQuery(params, category?.slug);
  const [results, places] = await Promise.all([loadSearch(query), loadPlaces()]);

  if (!results.ok) {
    return (
      <main className="page flex flex-col items-center gap-4 py-20 text-center">
        <h1 className="type-title [overflow-wrap:anywhere] hyphens-auto">{t('error.title')}</h1>
        <p className="max-w-lead">{t('error.body')}</p>
        <Link
          href={`${path}${catalogSearch(params)}`}
          className="bg-cta text-cta-fg border-cta rounded-pill inline-flex min-h-10 items-center border px-5 text-sm font-bold tracking-[0.03em] uppercase"
        >
          {t('error.retry')}
        </Link>
      </main>
    );
  }

  const { items, total } = results.data;
  const pages = Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE));
  // Nothing found is not a dead end: the newest items of the catalog come under the empty state.
  const instead = items.length === 0 ? await loadSearch({ sort: 'new', page: 1 } as CatalogQuery) : null;
  // Four fill two rows of two; where the grid has three columns, the fourth stays out (no lone card).
  const fresh = instead?.ok ? instead.data.items.slice(0, 4) : [];
  const cities = places.ok ? places.data.cities : [];
  const country = await currentCountry();
  const status = t('found', { count: total });

  return (
    <CatalogShell>
      <main className="page page-y stack-page">
        {/* No search box here: the one in the header holds the words (owner, 2026-11-28: search only in the navigation). */}
        <PageHeader title={title} intro={lead} crumbs={<Breadcrumbs items={crumbs} label={t('breadcrumbs.label')} />}>
          {related.length > 0 && (
            <nav aria-label={t('related')}>
              {/* One row that scrolls sideways (audit: two wrapped rows of chips pushed the results down). */}
              <ul className="-mx-4 flex snap-x scroll-px-4 [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1 sm:-mx-8 sm:scroll-px-8 sm:px-8 [&::-webkit-scrollbar]:hidden">
                {related.map((link) => (
                  <li key={link.href} className="shrink-0 snap-start">
                    <Link
                      href={link.href}
                      aria-current={link.current ? 'page' : undefined}
                      className={`rounded-pill ease-yoyo inline-flex min-h-10 items-center border px-4 text-sm font-bold transition-transform duration-250 active:scale-95 ${link.current ? 'bg-cta text-cta-fg border-cta' : 'border-ink hover:bg-mist bg-transparent'}`}
                    >
                      <span className="whitespace-nowrap">{link.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </PageHeader>

        <div className="layout-rail">
          <aside className="flex flex-col gap-4 max-lg:hidden">
            <FiltersRail params={params} cities={cities} country={country} today={today} total={total} />
          </aside>
          <div className="flex min-w-0 flex-col gap-5">
            <Toolbar
              params={params}
              filters={<FiltersButton params={params} cities={cities} country={country} today={today} total={total} />}
              save={
                <SaveSearchButton
                  query={{
                    q: params.q,
                    category: category?.slug,
                    priceMax: params.priceMax,
                    city: params.city,
                  }}
                />
              }
            />
            <ActiveFilters params={params} cities={cities} />
            {people}
            {params.q && <span hidden data-search-q={params.q} data-search-results={total} />}
            <ResultsRegion status={status}>
              <div className="flex flex-col gap-6">
                {items.length === 0 ? (
                  <>
                    <EmptyResults
                      params={params}
                      resetHref={params.q ? `${path}?q=${encodeURIComponent(params.q)}` : path}
                    />
                    {fresh.length > 0 && (
                      <section aria-labelledby="catalog-fresh-instead" className="stack-section" data-fresh-instead="">
                        <h2 id="catalog-fresh-instead" className="type-block">
                          {t('freshInstead')}
                        </h2>
                        <ul className="grid-cards-rail">
                          {fresh.map((item, index) => (
                            <li key={item.id} className={index === 3 ? 'xl:hidden' : undefined}>
                              <ListingCard item={item} />
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}
                  </>
                ) : (
                  <ul className="grid-cards-rail">
                    {items.map((item, index) => (
                      <li key={item.id}>
                        <ListingCard item={item} eager={index < 3} days={days} dates={params.from && params.to ? { from: params.from, to: params.to } : undefined} />
                      </li>
                    ))}
                  </ul>
                )}
                <Pagination
                  page={params.page}
                  pages={pages}
                  hrefFor={(page) => `${path}${catalogSearch(params, { page })}`}
                  labels={{
                    nav: t('pagination.label'),
                    previous: t('pagination.previous'),
                    next: t('pagination.next'),
                    status: t('pagination.status', { page: params.page, pages }),
                  }}
                />
              </div>
            </ResultsRegion>
          </div>
        </div>
        {intro && <RentalRules name={intro.name} />}
      </main>
    </CatalogShell>
  );
}
