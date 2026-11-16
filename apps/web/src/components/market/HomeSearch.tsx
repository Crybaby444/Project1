'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { RangeCalendar } from '@/components/catalog/RangeCalendar';
import { CityInput, type CityChoice } from '@/components/catalog/CityInput';
import type { Country } from '@yoyo/shared';
import { useRouter } from '@/i18n/navigation';

import type { Range } from '@/lib/catalog/range';

/**
 * The home's search, in its working form (the action visitors come for): what, where (any city of the
 * visitor's country, typed with suggestions) and when (a period on the site's own calendar). Sends to
 * /search with q, city, from, to.
 */
export function HomeSearch({ country, today }: { country: Country; today: string }) {
  const t = useTranslations('market.search');
  const locale = useLocale();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [city, setCity] = useState<CityChoice | null>(null);
  const [range, setRange] = useState<Range | null>(null);
  const [calendar, setCalendar] = useState(false);
  const ids = { q: useId(), where: useId(), when: useId() };
  const popover = useRef<HTMLDivElement>(null);
  const day = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const label = (d: string) => day.format(new Date(`${d}T00:00:00Z`));

  useEffect(() => {
    if (!calendar) return;
    const onDown = (e: PointerEvent) => !popover.current?.contains(e.target as Node) && setCalendar(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setCalendar(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [calendar]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (city) params.set('city', city.slug);
    if (range) {
      params.set('from', range.start);
      params.set('to', range.end ?? range.start);
    }
    const query = params.toString();
    router.push(query ? `/search?${query}` : '/search');
  }

  const cell = 'flex min-w-0 flex-col justify-center gap-0.5 px-5 py-2.5';
  const caption = 'text-ink/60 text-[11px] font-bold tracking-[0.06em] uppercase';
  return (
    <form role="search" onSubmit={submit} data-home-search="" className="border-ink bg-surface relative grid w-full grid-cols-1 rounded-[28px] border sm:rounded-[999px] md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
      <div className={`${cell} max-md:border-ink/15 max-md:border-b`}>
        <label htmlFor={ids.q} className={caption}>
          {t('what')}
        </label>
        <input
          id={ids.q}
          type="search"
          enterKeyHint="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('whatPlaceholder')}
          className="placeholder:text-ink/60 min-w-0 bg-transparent text-[17px] font-semibold outline-none [&::-webkit-search-cancel-button]:hidden"
        />
      </div>
      <div className={`${cell} border-ink/15 max-md:border-b md:border-l`}>
        <label htmlFor={ids.where} className={caption}>
          {t('where')}
        </label>
        <CityInput id={ids.where} country={country} value={city} onChange={setCity} className="text-[17px] font-semibold" />
      </div>
      <div ref={popover} className={`${cell} border-ink/15 relative md:border-l`}>
        <span id={ids.when} aria-hidden="true" className={caption}>
          {t('when')}
        </span>
        <button type="button" aria-label={`${t('when')}: ${range ? (range.end && range.end !== range.start ? `${label(range.start)} – ${label(range.end)}` : label(range.start)) : t('anyDays')}`} aria-expanded={calendar} onClick={() => setCalendar((v) => !v)} className="text-left text-[17px] font-semibold">
          {range ? (range.end && range.end !== range.start ? `${label(range.start)} – ${label(range.end)}` : label(range.start)) : <span className="text-ink/60">{t('anyDays')}</span>}
        </button>
        {calendar && (
          <div className="border-ink/15 bg-surface rounded-media animate-pop-in absolute top-[calc(100%+10px)] right-0 z-30 w-[min(92vw,640px)] border p-4 shadow-[0_32px_64px_-32px_rgba(10,11,14,0.5)] max-md:left-0">
            <RangeCalendar
              value={range}
              today={today}
              onChange={(r) => {
                setRange(r);
                if (r.end !== null) setCalendar(false);
              }}
            />
            {range && (
              <button type="button" onClick={() => setRange(null)} className="mt-2 text-sm font-bold underline decoration-1 underline-offset-4">
                {t('clearDays')}
              </button>
            )}
          </div>
        )}
      </div>
      <div className="p-2">
        <button
          type="submit"
          className="bg-cta text-cta-fg rounded-pill ease-yoyo flex h-full min-h-12 w-full items-center justify-center gap-2 px-6 text-[14px] font-bold tracking-[0.04em] uppercase transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.97]"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
            <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="m16 16 4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {t('submit')}
        </button>
      </div>
    </form>
  );
}
