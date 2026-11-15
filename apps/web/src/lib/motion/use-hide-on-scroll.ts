'use client';

import { useEffect, useState } from 'react';

/**
 * Like a yo-yo: the bar goes away while you scroll down and comes back as soon as you scroll up (or reach
 * the top). `locked` keeps it in place while one of its panels is open.
 */
export function useHideOnScroll(locked = false): boolean {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - last;
        if (y < 80) setHidden(false);
        else if (delta > 6) setHidden(true);
        else if (delta < -6) setHidden(false);
        last = y;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);
  return hidden && !locked;
}
