'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

type MarqueeProps = {
  items: string[];
  className?: string;
};

function Track({ items, hidden }: { items: string[]; hidden?: boolean }) {
  return (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
      {items.map((item, index) => (
        <li key={`${index}-${item}`} className="flex items-center gap-7 pr-7">
          {item}
          <span aria-hidden="true">✦</span>
        </li>
      ))}
    </ul>
  );
}

function PauseIcon({ paused }: { paused: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="currentColor">
      {paused ? <path d="M8 5.5v13l10-6.5z" /> : <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />}
    </svg>
  );
}

/**
 * Full-bleed announcement band (DESIGN.md Marquee Banner). The only continuous motion on the site.
 * It pauses on hover or keyboard focus, has a pause button for touch and keyboard users (WCAG 2.2.2),
 * and does not move at all for people who prefer reduced motion.
 */
export function Marquee({ items, className = '' }: MarqueeProps) {
  const t = useTranslations('marquee');
  const [paused, setPaused] = useState(false);

  return (
    <div
      className={`group relative flex items-center overflow-hidden bg-marquee text-xs font-bold tracking-[0.032em] whitespace-nowrap text-marquee-fg uppercase ${className}`}
    >
      <div
        data-marquee-track
        data-paused={paused || undefined}
        className="flex w-max animate-marquee py-3 group-focus-within:[animation-play-state:paused] group-hover:[animation-play-state:paused] data-[paused]:[animation-play-state:paused]"
      >
        <Track items={items} />
        <Track items={items} hidden />
      </div>
      <button
        type="button"
        onClick={() => setPaused((value) => !value)}
        aria-label={paused ? t('resume') : t('pause')}
        title={paused ? t('resume') : t('pause')}
        className="absolute right-1 inline-grid size-10 place-items-center rounded-pill border border-marquee-fg bg-marquee text-marquee-fg transition-transform duration-150 ease-yoyo hover:scale-105 active:scale-95 motion-reduce:hidden"
      >
        <PauseIcon paused={paused} />
      </button>
    </div>
  );
}
