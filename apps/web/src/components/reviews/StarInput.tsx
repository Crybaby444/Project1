'use client';

import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';

const STAR = 'M12 2.8l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 16.8l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z';

/**
 * Choosing 1–5 stars: a radio group (arrows move, each radio named "4 stars"), drawn as five stars
 * that fill up to the one under the pointer or the one chosen.
 */
export function StarInput({ legend, name, value, onChange, invalid }: { legend: string; name: string; value: number; onChange(value: number): void; invalid?: boolean }) {
  const t = useTranslations('reviews.deal');
  const id = useId();
  const [hover, setHover] = useState(0);
  const lit = hover || value;
  return (
    <fieldset role="radiogroup" aria-labelledby={`${id}-legend`} aria-invalid={invalid || undefined} className="m-0 flex flex-col gap-2 border-0 p-0">
      <legend id={`${id}-legend`} className="mb-1 p-0 text-[13px] font-bold tracking-[0.03em] uppercase">
        {legend}
      </legend>
      <div className="flex items-center gap-1" onPointerLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="group relative cursor-pointer" onPointerEnter={() => setHover(n)}>
            <input type="radio" name={`${id}-${name}`} value={n} checked={value === n} onChange={() => onChange(n)} className="peer sr-only" aria-label={t('starLabel', { count: n })} />
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className={`ease-yoyo size-9 transition-transform duration-200 group-hover:scale-110 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-current ${n <= lit ? 'text-ink' : 'text-ink/30'}`}
            >
              <path d={STAR} fill={n <= lit ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
