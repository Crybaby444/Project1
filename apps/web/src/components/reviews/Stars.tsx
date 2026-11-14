'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';

const STAR = 'M12 2.8l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 16.8l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z';

/**
 * A score out of 5 as five ink stars (a half star for .5 and above); read as "4.5 of 5", one image.
 */
export function Stars({ value, size = 14, className = '' }: { value: number; size?: number; className?: string }) {
  const t = useTranslations('reviews');
  const uid = useId();
  const shown = Math.round(value * 2) / 2;
  return (
    <span role="img" aria-label={t('stars', { rating: value })} className={`inline-flex items-center gap-0.5 ${className}`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const fill = shown >= n ? 1 : shown >= n - 0.5 ? 0.5 : 0;
        return (
          <svg key={n} viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className="shrink-0">
            <defs>
              <clipPath id={`${uid}-half-${n}`}>
                <rect x="0" y="0" width="12" height="24" />
              </clipPath>
            </defs>
            <path d={STAR} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            {fill > 0 && <path d={STAR} fill="currentColor" clipPath={fill === 0.5 ? `url(#${uid}-half-${n})` : undefined} />}
          </svg>
        );
      })}
    </span>
  );
}
