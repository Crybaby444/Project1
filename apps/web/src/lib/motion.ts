/** Motion tokens from DESIGN.md "Project adaptations" §1, for code that animates from JavaScript. */
export const EASE_YOYO = 'cubic-bezier(.2,.8,.2,1)';

/** Durations in milliseconds; everything stays within 150–450 ms. */
export const DURATION = { fast: 150, base: 250, slow: 450 } as const;

/** True when the visitor asked the OS for less motion. Safe to call during server rendering. */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}
