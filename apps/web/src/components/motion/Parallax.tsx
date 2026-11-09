'use client';

import { useCallback, useRef, type CSSProperties, type ReactNode } from 'react';
import { driftStyle } from './drift';
import { coverProgress, useInView, useReducedMotion, useScrollFallback, useScrollFrame } from './hooks';

type ParallaxScopeProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  'aria-hidden'?: boolean | 'true';
};

/**
 * The box that measures the scroll for the drifting layers inside it (motion.css, `[data-parallax]`):
 * any descendant with `data-parallax-layer` and `driftStyle(speed)` moves at its own speed. The
 * scope itself never moves, so measuring it never feeds back into itself. CSS scroll timelines drive
 * the layers where supported; elsewhere the scope writes its progress (`--parallax-p`) each frame
 * while on screen. The drift uses the CSS `translate` property, so it adds to a layer's own
 * `rotate` and `transform` (wobble, bob) instead of replacing them. It also marks itself
 * `data-in-view` so `data-bob` children float only on screen. Lighter on touch screens, still with
 * reduced motion.
 */
export function ParallaxScope({ children, className = '', style, ...rest }: ParallaxScopeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const fallback = useScrollFallback();
  const inView = useInView(ref, { once: false });

  const onFrame = useCallback((element: Element) => {
    const progress = coverProgress(element.getBoundingClientRect(), window.innerHeight);
    (element as HTMLElement).style.setProperty('--parallax-p', progress.toFixed(3));
  }, []);
  useScrollFrame(ref, fallback && !reduced, onFrame);

  return (
    <div
      ref={ref}
      {...rest}
      data-parallax=""
      data-armed={fallback && !reduced ? '' : undefined}
      data-in-view={inView ? '' : undefined}
      style={style}
      className={className}
    >
      {children}
    </div>
  );
}

type ParallaxProps = {
  children: ReactNode;
  /**
   * Drift relative to the page: 0 stays with the page, positive drifts up faster (feels nearer),
   * negative lags behind (feels farther). Keep it within -1…1.
   */
  speed?: number;
  className?: string;
};

/** One drifting layer in its own scope (see ParallaxScope). */
export function Parallax({ children, speed = 0.3, className = '' }: ParallaxProps) {
  return (
    <ParallaxScope className={`block ${className}`}>
      <span data-parallax-layer="" style={driftStyle(speed)} className="block size-full">
        {children}
      </span>
    </ParallaxScope>
  );
}

type BobProps = {
  children: ReactNode;
  /** Offsets the bob so neighbouring stickers do not move in step (ms). */
  delay?: number;
  className?: string;
};

/**
 * A gentle float for hero stickers (motion.css, `[data-bob]`): once, on a fresh page load, while on
 * screen, then the sticker rests; not at all with reduced motion.
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
