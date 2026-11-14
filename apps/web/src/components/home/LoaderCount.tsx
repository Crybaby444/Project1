'use client';

import { useEffect, useRef } from 'react';
import { LOADER_COUNT_MS, loaderEase } from './loader-count';

/**
 * The loader's number. On a fresh document the head script already counts it (until
 * `window.__homeCountEnd`); after a client-side navigation (a language switch) no head script runs, so this
 * counts it itself, 0 → 100 in the same 1.1 s.
 */
export function LoaderCount() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    // The head script is still counting this document's loader: leave it be.
    const headEnd = (window as { __homeCountEnd?: number }).__homeCountEnd;
    if (!el || (headEnd !== undefined && performance.now() < headEnd)) return;
    let raf = 0;
    let t0: number | null = null;
    const step = (now: number) => {
      t0 ??= now;
      const k = Math.min(1, (now - t0) / LOADER_COUNT_MS);
      el.textContent = String(Math.round(loaderEase(k) * 100));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <b ref={ref} className="home-loader-count" suppressHydrationWarning>
      0
    </b>
  );
}
