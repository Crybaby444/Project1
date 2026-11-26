'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { money } from '@/lib/deals/money';

/** Example day prices to start from (synthetic, labelled as examples). */
/** A number that runs to its new value instead of jumping (an odometer feel). */
function useRunning(value: number): number {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start = performance.now();
    const a = still ? value : from.current;
    let frame = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / 600);
      const eased = 1 - Math.pow(1 - k, 4);
      const v = a + (value - a) * eased;
      setShown(v);
      from.current = v;
      if (k < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return shown;
}

/**
 * Your things can earn (owner: keep it). Pick something like what you have — or set its day price — and how
 * many days a month it is out; the month's rent runs up in big figures, and the year under it. The owner
 * keeps the whole rent: the service fee is the renter's.
 */
export function LendCalculator() {
  const t = useTranslations('market.lend');
  const locale = useLocale();
  const [price, setPrice] = useState(15);
  const [days, setDays] = useState(6);
  const priceId = useId();
  const daysId = useId();
  const month = useRunning(price * days);
  const year = useRunning(price * days * 12);
  const slider =
    'h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[color-mix(in_srgb,var(--ink)_14%,transparent)] [&::-webkit-slider-thumb]:size-7 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--ink)] [&::-webkit-slider-thumb]:shadow-[0_0_0_5px_var(--canvas),0_0_0_6px_color-mix(in_srgb,var(--ink)_25%,transparent)] [&::-webkit-slider-thumb]:transition-transform active:[&::-webkit-slider-thumb]:scale-110 [&::-moz-range-thumb]:size-7 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[var(--ink)]';
  const fill = (v: number, min: number, max: number) => ({ background: `linear-gradient(to right, var(--ink) ${((v - min) / (max - min)) * 100}%, color-mix(in srgb, var(--ink) 14%, transparent) 0)` });
  const euros = (v: number) => money(Math.round(v) * 100, locale).replace(/[.,]00(?=\D*$)/, '');

  return (
    <section aria-labelledby="home-lend" className="page grid gap-12 py-24 sm:py-32 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center" data-home-lend="">
      <div className="flex flex-col gap-6">
        <h2 id="home-lend" className="font-display text-display-xl leading-[0.86] font-black uppercase">
          {t('title')}
        </h2>
        <p className="text-ink/80 max-w-lead text-lg leading-relaxed">{t('lead')}</p>
        <Button href="/listings/new" size="lg" className="self-start">
          {t('cta')}
        </Button>
      </div>

      <div className="flex flex-col gap-9">
        <div className="grid gap-8 sm:grid-cols-2">
          <div className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between gap-4">
              <label htmlFor={priceId} className="font-semibold">
                {t('price')}
              </label>
              <output htmlFor={priceId} className="font-display text-4xl leading-none font-black tabular-nums">
                {euros(price)}
              </output>
            </div>
            <input id={priceId} type="range" min={3} max={80} value={price} onChange={(e) => setPrice(Number(e.target.value))} className={slider} style={fill(price, 3, 80)} />
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between gap-4">
              <label htmlFor={daysId} className="font-semibold">
                {t('days')}
              </label>
              <output htmlFor={daysId} className="font-display text-4xl leading-none font-black tabular-nums">
                {t('daysValue', { count: days })}
              </output>
            </div>
            <input id={daysId} type="range" min={1} max={20} value={days} onChange={(e) => setDays(Number(e.target.value))} className={slider} style={fill(days, 1, 20)} />
          </div>
        </div>

        <div className="border-ink/15 flex flex-wrap items-end justify-between gap-x-10 gap-y-4 border-t pt-8">
          <div className="flex flex-col gap-2">
            <span className="text-ink/60 type-caption">{t('month')}</span>
            <span aria-live="polite" className="font-display text-[clamp(4.5rem,11vw,9rem)] leading-[0.8] font-black tabular-nums">
              {euros(month)}
            </span>
          </div>
          <div className="flex flex-col gap-2 pb-2">
            <span className="text-ink/60 type-caption">{t('year')}</span>
            <span className="font-display text-display-m leading-none font-black tabular-nums">{euros(year)}</span>
          </div>
        </div>
        <p className="text-ink/70 -mt-4 flex items-center gap-2 text-sm">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-[var(--glow)] ring-1 ring-black/25" />
          {t('note')}
        </p>
      </div>
    </section>
  );
}
