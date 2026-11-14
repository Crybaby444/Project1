import { DURATION, EASE_YOYO } from '@/lib/motion';

export type Point = { x: number; y: number };

const REVEAL_MS = DURATION.slow;

/** The circular reveal runs only when motion is welcome and the browser can do it. */
export function shouldAnimateThemeChange(prefersReducedMotion: boolean, supportsViewTransition: boolean): boolean {
  return !prefersReducedMotion && supportsViewTransition;
}

/**
 * Applies a theme change, optionally as a circle that grows from `origin`
 * (usually the toggle button) until it covers the farthest corner of the viewport.
 */
export function switchTheme(apply: () => void, origin: Point, animate: boolean): void {
  if (!animate) {
    apply();
    return;
  }

  const radius = Math.hypot(
    Math.max(origin.x, window.innerWidth - origin.x),
    Math.max(origin.y, window.innerHeight - origin.y),
  );
  const transition = document.startViewTransition(apply);
  transition.ready
    .then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${origin.x}px ${origin.y}px)`,
            `circle(${radius}px at ${origin.x}px ${origin.y}px)`,
          ],
        },
        { duration: REVEAL_MS, easing: EASE_YOYO, pseudoElement: '::view-transition-new(root)' },
      );
    })
    .catch(() => {
      // The transition was skipped (e.g. tab hidden); the theme is already applied.
    });
}

/**
 * Puts a theme on screen in one step: every CSS transition is off (`html[data-theme-instant]`) while
 * the colours change, and back on two frames later, so no text passes through unreadable half-way
 * colours. The visible change, when there is one, is the view transition's circle.
 */
export function applyThemeInstantly(apply: () => void): void {
  const html = document.documentElement;
  html.setAttribute('data-theme-instant', '');
  apply();
  void getComputedStyle(html).color; // land the new colours while transitions are off
  requestAnimationFrame(() => requestAnimationFrame(() => html.removeAttribute('data-theme-instant')));
}
