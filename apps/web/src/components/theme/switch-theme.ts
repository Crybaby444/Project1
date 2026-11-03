import { DURATION, EASE_YOYO } from '@/lib/motion';

export type Point = { x: number; y: number };

export function shouldAnimateThemeChange(prefersReducedMotion: boolean, supportsViewTransition: boolean): boolean {
  return supportsViewTransition && !prefersReducedMotion;
}

/** Distance from the origin to the farthest viewport corner — the final radius of the reveal circle. */
export function revealRadius(origin: Point, viewport: { width: number; height: number }): number {
  const dx = Math.max(origin.x, viewport.width - origin.x);
  const dy = Math.max(origin.y, viewport.height - origin.y);
  return Math.hypot(dx, dy);
}

/**
 * Applies a theme change. When `animate` is true the new theme is revealed as a circle growing from
 * `origin` (View Transitions API); otherwise `apply` runs immediately. `apply` must update the DOM
 * synchronously.
 */
export function switchTheme(apply: () => void, origin: Point, animate: boolean): void {
  if (!animate || typeof document === 'undefined' || !('startViewTransition' in document)) {
    apply();
    return;
  }
  const transition = document.startViewTransition(apply);
  const radius = revealRadius(origin, { width: window.innerWidth, height: window.innerHeight });
  transition.ready
    .then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${origin.x}px ${origin.y}px)`,
            `circle(${radius}px at ${origin.x}px ${origin.y}px)`,
          ],
        },
        { duration: DURATION.slow, easing: EASE_YOYO, pseudoElement: '::view-transition-new(root)' },
      );
    })
    .catch(() => {
      // The transition was skipped (e.g. the tab is hidden); the theme is already applied.
    });
}
