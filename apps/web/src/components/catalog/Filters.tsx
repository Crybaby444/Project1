'use client';

import type { PlacesResponse } from '@yoyo/shared';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Field } from '@/components/ui/Field';
import { Select } from '@/components/ui/Select';
import { INPUT_CLASS } from '@/components/ui/inputs';
import { catalogSearch, filterCount, type CatalogParams } from '@/lib/catalog/params';
import type { Range } from '@/lib/catalog/range';
import { useCatalogNavigation } from './CatalogShell';
import { RangeCalendar } from './RangeCalendar';

type FiltersProps = {
  params: CatalogParams;
  districts: PlacesResponse['districts'];
  /** Today in Riga, `YYYY-MM-DD`: the first day the dates filter offers. */
  today: string;
  /** How many items the current filters find (the phone sheet's button says it). */
  total: number;
};

const euros = (value: string) => (value.trim() === '' ? undefined : /^\d{1,5}$/.test(value.trim()) ? Number(value.trim()) : Number.NaN);

/** The filter fields (W03 §H): daily price, free dates, district. Each change goes to the address. */
function FilterFields({ params, districts, today }: Omit<FiltersProps, 'total'>) {
  const t = useTranslations('catalog.filters');
  const { navigate } = useCatalogNavigation();
  const ids = { price: useId(), dates: useId() };
  const [min, setMin] = useState(params.priceMin?.toString() ?? '');
  const [max, setMax] = useState(params.priceMax?.toString() ?? '');
  const [priceError, setPriceError] = useState<string | undefined>();
  const [range, setRange] = useState<Range | null>(params.from && params.to ? { start: params.from, end: params.to } : null);

  // The address changes from elsewhere too (a removed chip, Back): the fields follow it, during the
  // render (React's "adjusting state when a prop changes"), so there is no frame with stale values.
  // Only a field whose own value in the address changed is reset: applying "from" on blur must not
  // wipe what is already typed into "to" when that navigation lands.
  const fromAddress = { min: params.priceMin, max: params.priceMax, dates: `${params.from}|${params.to}` };
  const [seen, setSeen] = useState(fromAddress);
  if (seen.min !== fromAddress.min || seen.max !== fromAddress.max || seen.dates !== fromAddress.dates) {
    setSeen(fromAddress);
    if (seen.min !== fromAddress.min) setMin(params.priceMin?.toString() ?? '');
    if (seen.max !== fromAddress.max) setMax(params.priceMax?.toString() ?? '');
    if (seen.dates !== fromAddress.dates) {
      setRange(params.from && params.to ? { start: params.from, end: params.to } : null);
    }
  }

  function applyPrice() {
    const from = euros(min);
    const to = euros(max);
    if (Number.isNaN(from) || Number.isNaN(to)) return setPriceError(t('priceWhole'));
    if (from !== undefined && to !== undefined && to < from) return setPriceError(t('priceOrder'));
    setPriceError(undefined);
    if (from === params.priceMin && to === params.priceMax) return;
    navigate(catalogSearch(params, { priceMin: from, priceMax: to }));
  }

  function pickRange(next: Range) {
    setRange(next);
    if (next.end !== null) navigate(catalogSearch(params, { from: next.start, to: next.end }));
  }

  return (
    <div className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-3" aria-describedby={priceError ? `${ids.price}-error` : undefined}>
        <legend className="mb-3 text-[13px] font-bold tracking-[0.03em] uppercase">{t('price')}</legend>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              ['from', min, setMin],
              ['to', max, setMax],
            ] as const
          ).map(([which, value, set]) => (
            <Field key={which} label={t(which === 'from' ? 'priceFrom' : 'priceTo')} suffix="€">
              <input
                type="text"
                inputMode="numeric"
                value={value}
                aria-invalid={priceError ? true : undefined}
                onChange={(event) => set(event.target.value)}
                onBlur={applyPrice}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    applyPrice();
                  }
                }}
                className={`${INPUT_CLASS} pr-10 tabular-nums`}
              />
            </Field>
          ))}
        </div>
        {priceError && (
          <p id={`${ids.price}-error`} role="alert" className="text-sm font-bold">
            {priceError}
          </p>
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-[13px] font-bold tracking-[0.03em] uppercase">{t('dates')}</legend>
        <p id={ids.dates} className="text-sm">
          {t('datesHint')}
        </p>
        <RangeCalendar value={range} onChange={pickRange} today={today} twoMonths={false} />
        {range && (
          <Button
            variant="ghost"
            className="self-start"
            onClick={() => {
              setRange(null);
              navigate(catalogSearch(params, { from: undefined, to: undefined }));
            }}
          >
            {t('clearDates')}
          </Button>
        )}
      </fieldset>

      {districts.length > 0 && (
        <Field label={t('district')}>
          <Select
            value={params.district ?? ''}
            onChange={(next) => navigate(catalogSearch(params, { district: next || undefined }))}
            options={[
              { value: '', label: t('anyDistrict') },
              ...districts.map((d) => ({ value: d.slug, label: `${d.district} (${d.count})` })),
            ]}
          />
        </Field>
      )}
    </div>
  );
}

/**
 * The filters: a column next to the results on a computer; on a phone a "Filters (N)" button opens
 * them in a sheet whose button shows how many items they find.
 */
export function Filters(props: FiltersProps) {
  const t = useTranslations('catalog.filters');
  const [open, setOpen] = useState(false);
  const count = filterCount(props.params);
  return (
    <>
      <div className="hidden lg:block">
        <h2 className="sr-only">{t('title')}</h2>
        <FilterFields {...props} />
      </div>
      <div className="lg:hidden">
        <Button variant="ghost" onClick={() => setOpen(true)} aria-haspopup="dialog">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
            <path d="M4 7h10M18 7h2M4 17h4M12 17h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="16" cy="7" r="2" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="10" cy="17" r="2" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
          {count > 0 ? t('buttonCount', { count }) : t('button')}
        </Button>
        <Dialog open={open} onClose={() => setOpen(false)} title={t('title')}>
          <div className="flex flex-col gap-6">
            <FilterFields {...props} />
            <Button onClick={() => setOpen(false)} size="lg">
              {t('show', { count: props.total })}
            </Button>
          </div>
        </Dialog>
      </div>
    </>
  );
}
