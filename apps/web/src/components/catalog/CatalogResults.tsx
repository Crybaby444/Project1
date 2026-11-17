import { CATALOG_PAGE_SIZE, type CategoryNode, type Locale } from '@yoyo/shared';
import { currentCountry } from '@/lib/country/server';
import { getTranslations } from 'next-intl/server';
import { RentalRules } from './RentalRules';
import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { catalogSearch, type CatalogParams, toApiQuery } from '@/lib/catalog/params';
import { SaveSearchButton } from './SaveSearchButton';
import { daysBetween } from '@/lib/deals/dates';
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
  /** The root category's slug and this page's name, for the intro and the rules at the foot (category pages). */
  intro?: { root: string; name: string };
  children?: ReactNode;
};

/** Search and category pages: one layout (W03 §B), the results drawn on the server. */
export async function CatalogResults({ params: raw, category, related, path, title, crumbs, intro }: Props) {
  const t = await getTranslations('catalog');
  const ti = await getTranslations('categoryIntro');
  const lead = intro && ti.has(`roots.${intro.root}`) ? ti(`roots.${intro.root}`) : null;
  const today = todayIn('Europe/Riga');
  const params = usableParams(raw, today);
  const days = params.from && params.to ? daysBetween(params.from, params.to) : undefined;
  const query = toApiQuery(params, category?.slug);
  const [results, places, map] = await Promise.all([
    loadSearch(query),
    loadPlaces(),
    params.view === 'map' ? loadMap({ ...query, page: 1 }) : Promise.resolve(null),
  ]);

  if (!results.ok) {
    return (
      <main className="mx-auto flex w-full max-w-[1440px] flex-col items-center gap-4 px-4 py-20 text-center sm:px-8">
        <h1 className="font-display text-display-l leading-[0.95] font-black [overflow-wrap:anywhere] hyphens-auto uppercase">
          {t('error.title')}
        </h1>
        <p className="max-w-[46ch]">{t('error.body')}</p>
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
  const cities = places.ok ? places.data.cities : [];
  const country = await currentCountry();
  const status = t('found', { count: total });

  return (
    <CatalogShell>
      <main className="@container mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-8 sm:px-8 sm:py-10">
        <Breadcrumbs items={crumbs} label={t('breadcrumbs.label')} />
        <div className="flex flex-col gap-4">
          <h1
            style={displayFit(title, { min: '1.75rem', max: '3.5rem' })}
            className="font-display text-display-fit leading-[0.9] font-black uppercase"
          >
            {title}
          </h1>
          {lead && <p className="text-ink/80 max-w-[68ch] text-base leading-relaxed">{lead}</p>}
          <SearchBox initialQuery={params.q ?? ''} className="max-w-3xl" />
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
        </div>

        <div className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="flex flex-col gap-4">
            <Filters params={params} cities={cities} country={country} today={today} total={total} />
          </aside>
          <div className="flex min-w-0 flex-col gap-5">
            <Toolbar params={params} />
            <ActiveFilters params={params} cities={cities} />
            {params.q && <span hidden data-search-q={params.q} data-search-results={total} />}
            <SaveSearchButton
              query={{
                q: params.q,
                category: category?.slug,
                priceMax: params.priceMax,
                city: params.city,
              }}
            />
            <ResultsRegion status={status}>
              <div className="flex flex-col gap-6">
                {params.view === 'map' && map?.ok && (
                  <CatalogMapLoader pins={map.data.pins} truncated={map.data.truncated} />
                )}
                {items.length === 0 ? (
                  <EmptyResults
                    params={params}
                    resetHref={params.q ? `${path}?q=${encodeURIComponent(params.q)}` : path}
                  />
                ) : (
                  <ul className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-5 xl:grid-cols-3">
                    {items.map((item, index) => (
                      <li key={item.id}>
                        <ListingCard item={item} eager={index < 3} days={days} />
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
