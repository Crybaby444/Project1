/** Motion tokens (DESIGN.md "Project adaptations" §1). Mirrors --ease-yoyo / --dur-* in CSS. */
export const EASE_YOYO = 'cubic-bezier(.2,.8,.2,1)';

export const DURATION = { fast: 150, base: 250, slow: 450 } as const;

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
