'use client';

import type { PlacesResponse } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { catalogSearch, type CatalogParams } from '@/lib/catalog/params';
import { useCatalogNavigation } from './CatalogShell';

const asDate = (day: string) => new Date(`${day}T00:00:00Z`);

/** What is filtered on, as pills with a cross; «Reset all» keeps only the search text. */
export function ActiveFilters({ params, districts }: { params: CatalogParams; districts: PlacesResponse['districts'] }) {
  const t = useTranslations('catalog.active');
  const locale = useLocale();
  const { navigate } = useCatalogNavigation();
  const chips: { key: string; label: string; patch: Partial<CatalogParams> }[] = [];
  if (params.priceMin !== undefined || params.priceMax !== undefined) {
    const label =
      params.priceMin !== undefined && params.priceMax !== undefined
        ? t('priceBetween', { min: params.priceMin, max: params.priceMax })
        : params.priceMin !== undefined
          ? t('priceFrom', { min: params.priceMin })
          : t('priceTo', { max: params.priceMax! });
    chips.push({ key: 'price', label, patch: { priceMin: undefined, priceMax: undefined } });
  }
  if (params.from && params.to) {
    const format = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' });
    const dates = (params.from === params.to ? format.format(asDate(params.from)) : format.formatRange(asDate(params.from), asDate(params.to))).replace(/[  ]/g, ' ');
    chips.push({ key: 'dates', label: t('dates', { dates }), patch: { from: undefined, to: undefined } });
  }
  if (params.district) {
    const name = districts.find((d) => d.slug === params.district)?.district ?? params.district;
    chips.push({ key: 'district', label: name, patch: { district: undefined } });
  }
  if (chips.length === 0) return null;
  return (
    <ul aria-label={t('label')} className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <li key={chip.key}>
          <button
            type="button"
            onClick={() => navigate(catalogSearch(params, chip.patch))}
            aria-label={t('remove', { filter: chip.label })}
            className="border-ink bg-sticker-lavender rounded-pill ease-yoyo inline-flex min-h-10 items-center gap-2 border py-1 pr-2 pl-4 text-sm font-bold text-black transition-transform duration-150 hover:-translate-y-0.5 hover:-rotate-2 active:scale-95"
          >
            <span className="[overflow-wrap:anywhere]">{chip.label}</span>
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 shrink-0">
              <path d="m7 7 10 10M17 7 7 17" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
            </svg>
          </button>
        </li>
      ))}
      <li>
        <button
          type="button"
          onClick={() => navigate(catalogSearch({ page: 1, view: params.view, ...(params.q !== undefined && { q: params.q }) }))}
          className="rounded-pill min-h-10 px-3 text-sm font-bold underline underline-offset-4"
        >
          {t('resetAll')}
        </button>
      </li>
    </ul>
  );
}
