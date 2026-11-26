'use client';

import { useTranslations } from 'next-intl';
import { useId, type ReactNode } from 'react';
import { Select } from '@/components/ui/Select';
import { catalogSearch, SORTS, type CatalogParams, type Sort } from '@/lib/catalog/params';
import { useCatalogNavigation } from './CatalogShell';

/**
 * Everything that works on the results, in one toolbar: the filters' button (below lg, where the filters
 * leave the rail), the sort, "tell me about new items" and the «List / Map» switch. On a computer one row
 * with the switch at its end; on a phone two: filters and sort, then the alert and the switch.
 */
export function Toolbar({ params, filters, save }: { params: CatalogParams; filters?: ReactNode; save?: ReactNode }) {
  const t = useTranslations('catalog');
  const { navigate } = useCatalogNavigation();
  const sortId = useId();
  const current = params.sort ?? (params.q ? 'relevance' : 'new');
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
      <div className="flex min-w-0 items-center gap-2 sm:contents">
      {filters}
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
        <label htmlFor={sortId} className="type-label max-sm:sr-only">
          {t('sort.label')}
        </label>
        <Select
          id={sortId}
          value={current}
          className="min-w-0 flex-1 sm:min-w-44 sm:flex-none"
          onChange={(value) => navigate(catalogSearch(params, { sort: value === 'relevance' ? undefined : (value as Sort) }))}
          options={[
            ...(params.q ? [{ value: 'relevance', label: t('sort.relevance') }] : []),
            ...SORTS.map((sort) => ({ value: sort, label: t(`sort.${sort}`) })),
          ]}
        />
      </div>
      </div>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 sm:contents">
      {save ?? <span />}
      <div role="group" aria-label={t('view.label')} className="border-ink rounded-pill bg-surface ml-auto inline-flex shrink-0 border p-1">
        {(['list', 'map'] as const).map((view) => (
          <button
            key={view}
            type="button"
            aria-pressed={params.view === view}
            onClick={() => navigate(catalogSearch(params, { view }))}
            className={`rounded-pill ease-yoyo inline-flex min-h-9 min-w-10 items-center justify-center gap-2 px-3 text-sm font-bold tracking-[0.03em] uppercase transition-[background-color,color,transform] duration-250 active:scale-95 sm:px-4 ${
              params.view === view ? 'bg-cta text-cta-fg' : 'hover:bg-mist'
            }`}
          >
            {/* A phone shows the two views as icons; the words are read out there, and shown from sm up. */}
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 shrink-0 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:2] sm:hidden">
              {view === 'list' ? (
                <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />
              ) : (
                <path d="M9 4.5 3.5 6.5v13l5.5-2 6 2 5.5-2v-13l-5.5 2-6-2Zm0 0v13m6-11v13" />
              )}
            </svg>
            <span className="max-sm:sr-only">{t(`view.${view}`)}</span>
          </button>
        ))}
      </div>
      </div>
    </div>
  );
}
