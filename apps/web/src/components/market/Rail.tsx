'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * A row of things that scrolls sideways (the home's shelves, owner 2026-11-28: "look at how the big
 * companies do it"): the title, a "see all" link and two arrows on the right; the cards snap into place.
 * A finger swipes it, the arrows page it on a desktop and stay quiet at either end. Each child is an `<li>`
 * given the rail's card width (`RAIL_ITEM`).
 */
export function Rail({ id, title, action, children }: { id: string; title: ReactNode; action?: ReactNode; children: ReactNode }) {
  const t = useTranslations('market.rail');
  const list = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: true });

  const measure = useCallback(() => {
    const el = list.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  const page = (direction: 1 | -1) => {
    const el = list.current;
    if (!el) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({ left: direction * el.clientWidth * 0.92, behavior: still ? 'auto' : 'smooth' });
  };

  const arrow = 'border-ink/20 hover:border-ink rounded-pill ease-yoyo grid size-10 place-items-center border transition-[border-color,opacity,transform] duration-200 active:scale-95 disabled:pointer-events-none disabled:opacity-30';

  return (
    <section aria-labelledby={id} className="stack-section" data-rail={id}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <h2 id={id} className="type-section">
          {title}
        </h2>
        <div className="flex items-center gap-4">
          {action}
          <div className="flex gap-2 max-sm:hidden">
            <button type="button" className={arrow} aria-label={t('previous')} aria-controls={`${id}-list`} disabled={edge.start} onClick={() => page(-1)}>
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:2]">
                <path d="M14.5 6 8.5 12l6 6" />
              </svg>
            </button>
            <button type="button" className={arrow} aria-label={t('next')} aria-controls={`${id}-list`} disabled={edge.end} onClick={() => page(1)}>
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:2]">
                <path d="m9.5 6 6 6-6 6" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      <ul
        ref={list}
        id={`${id}-list`}
        onScroll={measure}
        className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:-mx-8 sm:scroll-px-8 sm:gap-4 sm:px-8 lg:mx-0 lg:scroll-px-0 lg:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </ul>
    </section>
  );
}

/** The width of a card on a rail: two and a bit on a phone, three on a tablet, four on a desktop. */
export const RAIL_ITEM = 'w-[44vw] max-w-[15rem] shrink-0 snap-start sm:w-[calc((100%-2*1rem)/3)] sm:max-w-none lg:w-[calc((100%-3*1rem)/4)]';
