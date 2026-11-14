export type ViewSize = { w: number; h: number };

/**
 * Whether a resize should lay the staged home out again. On a phone the height changes every time the
 * browser bar hides or shows while scrolling; laying the scenes out again then made the yo-yo jump and
 * flashed other scenes, so a phone only follows a change of width (it turned).
 */
export function shouldRelayout(prev: ViewSize, next: ViewSize, mobile: boolean): boolean {
  if (next.w !== prev.w) return true;
  return !mobile && next.h !== prev.h;
}
