'use client';

import { useCallback, useRef, type CSSProperties, type ReactNode } from 'react';
import { coverProgress, useInView, useReducedMotion, useScrollFallback, useScrollFrame } from './hooks';

/** How far (px) a layer with speed 1 drifts each way across the viewport; motion.css halves it on touch. */
export const PARALLAX_RANGE_PX = 120;

type ParallaxProps = {
  children: ReactNode;
  /**
   * Drift relative to the page: 0 stays with the page, positive drifts up faster (feels nearer),
   * negative lags behind (feels farther). Keep it within -1…1.
   */
  speed?: number;
  className?: string;
};

/** The drift of a layer at `progress` (0…1 through the viewport), in px: +range at 0, -range at 1. */
export function parallaxOffset(progress: number, speed: number, range = PARALLAX_RANGE_PX): number {
  return Math.round(speed * range * (1 - 2 * progress) * 10) / 10 || 0;
}

/**
 * A layer that drifts at its own speed while the page scrolls (motion.css, `[data-parallax]`). The
 * outer box is measured and never moves; the inner one is translated, so the measurement never feeds
 * back into itself. CSS scroll timelines drive it where supported, a frame loop elsewhere. Lighter on
 * touch screens, still with reduced motion.
 */
export function Parallax({ children, speed = 0.3, className = '' }: ParallaxProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const fallback = useScrollFallback();

  const onFrame = useCallback(
    (element: Element) => {
      const coarse = window.matchMedia?.('(pointer: coarse)').matches === true;
      const offset = parallaxOffset(
        coverProgress(element.getBoundingClientRect(), window.innerHeight),
        speed,
      );
      (element as HTMLElement).style.setProperty('--parallax-y', `${coarse ? offset * 0.4 : offset}px`);
    },
    [speed],
  );
  useScrollFrame(ref, fallback && !reduced, onFrame);

  return (
    <span
      ref={ref}
      data-parallax=""
      data-armed={fallback && !reduced ? '' : undefined}
      style={{ '--speed': speed } as CSSProperties}
      className={`block ${className}`}
    >
      <span data-parallax-layer="" className="block">
        {children}
      </span>
    </span>
  );
}

type BobProps = {
  children: ReactNode;
  /** Offsets the bob so neighbouring stickers do not move in step (ms). */
  delay?: number;
  className?: string;
};

/**
 * A gentle float for hero stickers (motion.css, `[data-bob]`). It runs only while on screen and
 * not at all with reduced motion.
 */
export function Bob({ children, delay = 0, className = '' }: BobProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: false });
  return (
    <span
      ref={ref}
      data-bob=""
      data-in-view={inView ? '' : undefined}
      style={{ '--bob-delay': `${-delay}ms` } as CSSProperties}
      className={`inline-block ${className}`}
    >
      {children}
    </span>
  );
}
