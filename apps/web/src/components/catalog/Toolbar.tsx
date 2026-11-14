'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';
import { Select } from '@/components/ui/Select';
import { catalogSearch, SORTS, type CatalogParams, type Sort } from '@/lib/catalog/params';
import { useCatalogNavigation } from './CatalogShell';

/** Sort and the «List / Map» switch above the results. */
export function Toolbar({ params }: { params: CatalogParams }) {
  const t = useTranslations('catalog');
  const { navigate } = useCatalogNavigation();
  const sortId = useId();
  const current = params.sort ?? (params.q ? 'relevance' : 'new');
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
        <label htmlFor={sortId} className="text-[13px] font-bold tracking-[0.03em] uppercase">
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
      <div role="group" aria-label={t('view.label')} className="border-ink rounded-pill bg-surface ml-auto inline-flex border p-1">
        {(['list', 'map'] as const).map((view) => (
          <button
            key={view}
            type="button"
            aria-pressed={params.view === view}
            onClick={() => navigate(catalogSearch(params, { view }))}
            className={`rounded-pill ease-yoyo min-h-9 px-4 text-[13px] font-bold tracking-[0.03em] uppercase transition-[background-color,color,transform] duration-250 active:scale-95 ${
              params.view === view ? 'bg-cta text-cta-fg' : 'hover:bg-mist'
            }`}
          >
            {t(`view.${view}`)}
          </button>
        ))}
      </div>
    </div>
  );
}
