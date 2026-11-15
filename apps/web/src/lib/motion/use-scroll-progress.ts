'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * How far the page has scrolled through a tall section, 0 at its top reaching the top of the screen and 1
 * when its end does — for scenes held on screen by a sticky inner box. Smoothed a little each frame, so the
 * scene glides rather than ticks. Under reduced motion it reports 1 (the finished state).
 */
export function useScrollProgress<T extends HTMLElement>(): [RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let frame = 0;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      frame = requestAnimationFrame(() => setProgress(1));
      return () => cancelAnimationFrame(frame);
    }
    let shown = 0;
    const tick = () => {
      const el = ref.current;
      if (el) {
        const box = el.getBoundingClientRect();
        const travel = Math.max(1, box.height - window.innerHeight);
        const target = Math.min(1, Math.max(0, -box.top / travel));
        shown += (target - shown) * 0.18;
        if (Math.abs(target - shown) < 0.0005) shown = target;
        setProgress(shown);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);
  return [ref, progress];
}
