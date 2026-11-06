'use client';

import { useEffect, useState, useSyncExternalStore, type RefObject } from 'react';

const REDUCE = '(prefers-reduced-motion: reduce)';

function subscribeReduced(onChange: () => void): () => void {
  const query = window.matchMedia?.(REDUCE);
  query?.addEventListener?.('change', onChange);
  return () => query?.removeEventListener?.('change', onChange);
}

/**
 * True when the visitor asked the OS for less motion. Follows the setting live. On the server, and
 * during hydration, it is false: the CSS handles reduced motion before any script runs.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia?.(REDUCE).matches === true,
    () => false,
  );
}

/** Whether the browser runs CSS scroll-driven animations (`animation-timeline: view()`). */
export function supportsScrollTimeline(): boolean {
  return (
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('animation-timeline: view()')
  );
}

const noSubscription = () => () => {};

/**
 * True when this browser needs the JavaScript fallback for scroll-driven animations. False on the
 * server and during hydration (so the markup matches), then the real answer.
 */
export function useScrollFallback(): boolean {
  return useSyncExternalStore(
    noSubscription,
    () => !supportsScrollTimeline(),
    () => false,
  );
}

/** False on the server and during hydration, true once the page runs in the browser. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
}

export type InViewOptions = {
  /** Stop watching after the first time the element is seen (reveals). Default true. */
  once?: boolean;
  /** Grows or shrinks the viewport for the test, like IntersectionObserver's rootMargin. */
  rootMargin?: string;
  threshold?: number;
};

/**
 * True while (or, with `once`, after) the element is in the viewport. Off-screen animations use it
 * to start lazily. Without IntersectionObserver the element counts as visible, so nothing stays hidden.
 */
export function useInView(
  ref: RefObject<Element | null>,
  { once = true, rootMargin = '0px', threshold = 0 }: InViewOptions = {},
): boolean {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (typeof IntersectionObserver === 'undefined') {
      const frame = requestAnimationFrame(() => setInView(true));
      return () => cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (!entry) return;
        if (entry.isIntersecting) {
          setInView(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { rootMargin, threshold },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, once, rootMargin, threshold]);

  return inView;
}

/**
 * Calls `onFrame` once per animation frame while the element is in view and the page scrolls or
 * resizes: the JavaScript fallback for browsers without scroll-driven animations. Nothing runs when
 * `enabled` is false.
 */
export function useScrollFrame(
  ref: RefObject<Element | null>,
  enabled: boolean,
  onFrame: (element: Element) => void,
): void {
  const inView = useInView(ref, { once: false, rootMargin: '20% 0px' });

  useEffect(() => {
    const element = ref.current;
    if (!enabled || !inView || !element) return;
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        onFrame(element);
      });
    };
    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ref, enabled, inView, onFrame]);
}

/**
 * How far an element has travelled through the viewport: 0 when its top meets the bottom edge,
 * 1 when its bottom leaves the top edge (CSS `view()` "cover"). Clamped to 0…1.
 */
export function coverProgress(rect: { top: number; height: number }, viewportHeight: number): number {
  const total = viewportHeight + rect.height;
  if (total <= 0) return 0;
  return Math.min(1, Math.max(0, (viewportHeight - rect.top) / total));
}
