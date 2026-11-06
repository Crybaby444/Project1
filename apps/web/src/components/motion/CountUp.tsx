'use client';

import { useLocale } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { useHydrated, useInView, useReducedMotion } from './hooks';

type CountUpProps = {
  value: number;
  /** How long the count takes, in ms. */
  duration?: number;
  /** Formats a number for display; defaults to the page language's grouping (1 234 / 1,234). */
  format?: (value: number) => string;
  className?: string;
};

/** Ease-out: quick at the start, settling at the end, like a counter slowing down. */
export function easeOutCubic(t: number): number {
  return 1 - (1 - Math.min(1, Math.max(0, t))) ** 3;
}

/**
 * A number that ticks up from zero the first time it scrolls into view. The final value is what the
 * server renders and what assistive tech reads; the ticking copy sits on top of an invisible final
 * value, so the width never changes (no layout shift). With reduced motion it just shows the value.
 */
export function CountUp({ value, duration = 900, format, className = '' }: CountUpProps) {
  const locale = useLocale();
  const show = format ?? ((n: number) => new Intl.NumberFormat(locale).format(n));
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const hydrated = useHydrated();
  const inView = useInView(ref, { rootMargin: '0px 0px -10% 0px' });
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (reduced || !inView) return;
    let frame = requestAnimationFrame(function tick(start: number) {
      const step = (now: number) => {
        const t = (now - start) / duration;
        setCurrent(t >= 1 ? value : Math.round(value * easeOutCubic(t)));
        if (t < 1) frame = requestAnimationFrame(step);
      };
      step(start);
    });
    return () => cancelAnimationFrame(frame);
  }, [reduced, inView, value, duration]);

  const final = show(value);
  // The server (and a page without JS) shows the value; in the browser the counter waits at zero
  // until it is first seen, then counts up to it.
  const visible = !hydrated || reduced ? final : show(current);

  return (
    <span ref={ref} data-count-up="" className={`inline-grid tabular-nums ${className}`}>
      <span aria-hidden="true" className="invisible col-start-1 row-start-1">
        {final}
      </span>
      <span aria-hidden="true" data-count-value="" className="col-start-1 row-start-1 text-end">
        {visible}
      </span>
      <span className="sr-only">{final}</span>
    </span>
  );
}
