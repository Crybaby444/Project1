'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';
import { INPUT_CLASS } from '@/components/ui/inputs';
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
      <div className="flex items-center gap-2">
        <label htmlFor={sortId} className="text-[13px] font-bold tracking-[0.03em] uppercase">
          {t('sort.label')}
        </label>
        <select
          id={sortId}
          value={current}
          onChange={(event) => {
            const value = event.target.value;
            navigate(catalogSearch(params, { sort: value === 'relevance' ? undefined : (value as Sort) }));
          }}
          className={`${INPUT_CLASS} w-auto min-w-0 appearance-none pr-9`}
        >
          {params.q && <option value="relevance">{t('sort.relevance')}</option>}
          {SORTS.map((sort) => (
            <option key={sort} value={sort}>
              {t(`sort.${sort}`)}
            </option>
          ))}
        </select>
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
