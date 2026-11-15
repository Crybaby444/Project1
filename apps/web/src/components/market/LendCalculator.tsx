'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { money } from '@/lib/deals/money';

/**
 * For owners: what a thing on the shelf could bring a month — the day's price times the days it is out.
 * The owner keeps the whole rent (the service fee is the renter's). Plain sliders, live numbers.
 */
export function LendCalculator() {
  const t = useTranslations('market.lend');
  const locale = useLocale();
  const [price, setPrice] = useState(15);
  const [days, setDays] = useState(6);
  const priceId = useId();
  const daysId = useId();
  const slider =
    'h-2 w-full cursor-pointer appearance-none rounded-full bg-[color-mix(in_srgb,var(--ink)_14%,transparent)] accent-[var(--ink)] [&::-webkit-slider-thumb]:size-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[var(--canvas)] [&::-webkit-slider-thumb]:bg-[var(--ink)] [&::-webkit-slider-thumb]:shadow-[0_0_0_1px_var(--ink)]';
  return (
    <section aria-labelledby="home-lend" className="mx-auto grid w-full max-w-[1440px] gap-10 px-4 py-20 sm:px-8 sm:py-28 lg:grid-cols-2 lg:items-center" data-home-lend="">
      <div className="flex flex-col gap-5">
        <h2 id="home-lend" className="font-display text-[clamp(2.8rem,6vw,5.2rem)] leading-[0.86] font-black uppercase">
          {t('title')}
        </h2>
        <p className="text-ink/80 max-w-[48ch] text-[18px] leading-relaxed">{t('lead')}</p>
        <Button href="/listings/new" size="lg" className="self-start">
          {t('cta')}
        </Button>
      </div>
      <div className="border-ink/15 bg-surface rounded-media flex flex-col gap-7 border p-6 sm:p-9">
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-4">
            <label htmlFor={priceId} className="font-semibold">
              {t('price')}
            </label>
            <output htmlFor={priceId} className="font-display text-[1.8rem] leading-none font-black tabular-nums">
              {money(price * 100, locale)}
            </output>
          </div>
          <input id={priceId} type="range" min={3} max={80} value={price} onChange={(e) => setPrice(Number(e.target.value))} className={slider} />
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-4">
            <label htmlFor={daysId} className="font-semibold">
              {t('days')}
            </label>
            <output htmlFor={daysId} className="font-display text-[1.8rem] leading-none font-black tabular-nums">
              {t('daysValue', { count: days })}
            </output>
          </div>
          <input id={daysId} type="range" min={1} max={20} value={days} onChange={(e) => setDays(Number(e.target.value))} className={slider} />
        </div>
        <div className="border-ink/15 flex flex-col gap-1 border-t pt-6">
          <span className="text-ink/70 text-[13px] font-bold tracking-[0.04em] uppercase">{t('month')}</span>
          <span aria-live="polite" className="font-display text-[clamp(3.6rem,8vw,6rem)] leading-[0.85] font-black tabular-nums">
            {money(price * days * 100, locale)}
          </span>
          <span className="text-ink/70 flex items-center gap-2 text-[14px]">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-[var(--glow)] ring-1 ring-black/25" />
            {t('note')}
          </span>
        </div>
      </div>
    </section>
  );
}
