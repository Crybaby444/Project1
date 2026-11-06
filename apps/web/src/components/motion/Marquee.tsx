'use client';

import { useTranslations } from 'next-intl';
import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useInView } from './hooks';

type MarqueeRowProps = {
  children: ReactNode;
  /** Runs right to left by default; `reverse` runs left to right. */
  reverse?: boolean;
  /** Seconds for one full loop. */
  seconds?: number;
  paused?: boolean;
};

/**
 * One endlessly looping row (motion.css, `[data-marquee-row]`). The content is drawn twice so the
 * loop has no seam; the copy is inert and hidden from assistive tech. The row only moves while it is
 * on screen, stops on hover or focus, and with reduced motion wraps into a still, readable block.
 */
export function MarqueeRow({ children, reverse = false, seconds = 28, paused = false }: MarqueeRowProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false });

  return (
    <div ref={ref} data-marquee-row="" className="overflow-hidden">
      <div
        data-marquee-row-track=""
        data-in-view={inView ? '' : undefined}
        data-paused={paused ? '' : undefined}
        style={{ '--marquee-seconds': `${seconds}s` } as CSSProperties}
        className={reverse ? '[animation-direction:reverse]' : undefined}
      >
        <div data-marquee-set="" className="flex shrink-0 items-center gap-3 pr-3">
          {children}
        </div>
        <div
          data-marquee-set=""
          data-marquee-copy=""
          aria-hidden="true"
          inert
          className="flex shrink-0 items-center gap-3 pr-3"
        >
          {children}
        </div>
      </div>
    </div>
  );
}

const PILL_TONES = ['bg-sticker-blue', 'bg-sticker-mint', 'bg-sticker-lavender', 'bg-sticker-sun'] as const;

type MarqueeProps = {
  /** Each row is a list of short words; rows run in opposite directions. */
  rows: string[][];
  /**
   * The words repeat what the page already says (category names above their cards): hide the rows
   * from assistive tech. The pause button stays reachable either way.
   */
  decorative?: boolean;
  className?: string;
};

/**
 * Rows of big uppercase words in pills, alternately outlined and filled with sticker colours,
 * running in opposite directions. One button pauses every row (WCAG 2.2.2), which also matters on
 * touch screens where there is no hover.
 */
export function Marquee({ rows, decorative = false, className = '' }: MarqueeProps) {
  const t = useTranslations('marquee');
  const [paused, setPaused] = useState(false);

  return (
    <div data-marquee="" className={`group/marquee relative ${className}`}>
      <div aria-hidden={decorative || undefined} className="flex flex-col gap-3">
        {rows.map((words, row) => (
          <MarqueeRow key={row} reverse={row % 2 === 1} seconds={26 + row * 6} paused={paused}>
            {words.map((word, index) => {
              const filled = (index + row) % 2 === 0;
              return (
                <span
                  key={`${index}-${word}`}
                  className={`font-display border-ink rounded-pill inline-flex min-h-12 items-center border px-5 text-[clamp(1.25rem,5vw,3rem)] leading-none font-black whitespace-nowrap uppercase sm:min-h-16 sm:px-7 ${
                    filled
                      ? `${PILL_TONES[(index + row) % PILL_TONES.length]} text-black`
                      : 'text-ink bg-transparent'
                  }`}
                >
                  {word}
                </span>
              );
            })}
          </MarqueeRow>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setPaused((value) => !value)}
        aria-pressed={paused}
        aria-label={paused ? t('resume') : t('pause')}
        title={paused ? t('resume') : t('pause')}
        className="border-ink bg-surface text-ink rounded-pill ease-yoyo absolute -top-5 right-2 inline-grid size-10 place-items-center border transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.96] motion-reduce:hidden"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="currentColor">
          {paused ? <path d="M8 5.5v13l10-6.5z" /> : <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />}
        </svg>
      </button>
    </div>
  );
}
