'use client';

import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '@/lib/motion';

/** Counting needs a real browser that allows motion (not tests, not an automated browser). */
function canAnimate(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    !prefersReducedMotion() &&
    !navigator.webdriver
  );
}

/**
 * A number that counts up to `target` when it first arrives and glides to a new value when it changes
 * (exponential ease-out, ~0.9 s). With reduced motion, on the server or in tests, it is simply `target`.
 */
export function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(() => (canAnimate() ? 0 : target));
  const from = useRef(0);
  const first = useRef(true);

  useEffect(() => {
    if (!canAnimate()) return;
    const start = first.current ? 0 : from.current;
    first.current = false;
    if (start === target) return;
    let frame = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = p === 1 ? 1 : 1 - 2 ** (-10 * p);
      const next = start + (target - start) * eased;
      from.current = next;
      setValue(p === 1 ? target : next);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return canAnimate() ? value : target;
}
