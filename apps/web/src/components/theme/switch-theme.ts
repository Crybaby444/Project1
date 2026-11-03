import { DURATION, EASE_YOYO } from '@/lib/motion';

export interface Point {
  x: number;
  y: number;
}

export function shouldAnimateThemeChange(
  prefersReducedMotion: boolean,
  supportsViewTransition: boolean,
): boolean {
  return supportsViewTransition && !prefersReducedMotion;
}

/** Radius from `origin` to the farthest viewport corner. */
function revealRadius({ x, y }: Point): number {
  return Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
}

/**
 * Applies a theme change. When `animate` is true the new theme grows out of
 * `origin` as a circle (View Transitions + clip-path), otherwise it is instant.
 */
export function switchTheme(apply: () => void, origin: Point, animate: boolean): void {
  if (!animate || typeof document.startViewTransition !== 'function') {
    apply();
    return;
  }

  const transition = document.startViewTransition(apply);
  void transition.ready
    .then(() => {
      const r = revealRadius(origin);
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${origin.x}px ${origin.y}px)`,
            `circle(${r}px at ${origin.x}px ${origin.y}px)`,
          ],
        },
        {
          duration: DURATION.slow,
          easing: EASE_YOYO,
          pseudoElement: '::view-transition-new(root)',
        },
      );
    })
    .catch(() => {
      /* transition skipped — the theme is applied anyway */
    });
}
