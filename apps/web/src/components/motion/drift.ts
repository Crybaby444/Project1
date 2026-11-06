import type { CSSProperties } from 'react';

/**
 * Inline style that makes an element a drifting layer (`data-parallax-layer`) of the nearest
 * ParallaxScope: `speed` 0 stays with the page, positive drifts up faster, negative lags behind.
 * A plain function, so server components can call it too.
 */
export function driftStyle(speed: number): CSSProperties {
  return { '--speed': speed } as CSSProperties;
}
