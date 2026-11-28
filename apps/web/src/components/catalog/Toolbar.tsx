'use client';

import { useTranslations } from 'next-intl';
import { useId, type ReactNode } from 'react';
import { Select } from '@/components/ui/Select';
import { catalogSearch, SORTS, type CatalogParams, type Sort } from '@/lib/catalog/params';
import { useCatalogNavigation } from './CatalogShell';

/**
 * Everything that works on the results, in one toolbar: the filters' button (below lg, where the filters
 * leave the rail), the sort and "tell me about new items". On a computer one row; on a phone two: filters
 * and sort, then the alert. (The map view is gone: owner, 2026-11-28, "not needed".)
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
      </div>
    </div>
  );
}
