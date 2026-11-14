/**
 * The maths of the drop cursor (DropCursor.tsx), kept pure so it can be tested without WebGL.
 * Values come from the v16 concept (docs/design/concept-v16.html).
 */

export type Drop = { x: number; y: number; r: number };

/**
 * Radius of the drop under the pointer, in CSS pixels: 9 at rest, swelling with speed up to 31,
 * melting into the fill while it sits on something clickable (hover 0..1), splashing on a click (burst 0..1).
 */
export function headRadius(speedPxPerS: number, hover: number, burst: number): number {
  return (9 + Math.min(speedPxPerS * 0.016, 22)) * (1 - hover * 0.85) + burst * 20;
}

/**
 * The drops that spread over a hovered element and merge into its shape: `n` along its vertical middle,
 * each a little under half its height (the metaball field adds up, so the sum fills the capsule exactly).
 * `plop` is the elastic entry value (26 at rest), `hover` 0..1 how far the fill has spread.
 */
export function fillPoints(rect: DOMRect, n = 5, hover: number, plop: number): Drop[] {
  const rad = Math.min(rect.height / 2, 40) * 0.68;
  const x0 = rect.left + rad * 1.15;
  const x1 = Math.max(x0, rect.right - rad * 1.15);
  const y = rect.top + rect.height / 2;
  return Array.from({ length: n }, (_, j) => ({
    x: n === 1 ? (x0 + x1) / 2 : x0 + ((x1 - x0) * j) / (n - 1),
    y,
    r: rad * hover * (plop / 26),
  }));
}

/**
 * Whether the drops moved since the last drawn frame (more than a twentieth of a pixel or of a radius).
 * A still cursor needs no new frame: the full-screen shader is the costly part, so it is skipped.
 */
export function moved(prev: Float32Array, next: Float32Array, eps = 0.05): boolean {
  for (let i = 0; i < next.length; i++) if (Math.abs(next[i]! - prev[i]!) > eps) return true;
  return false;
}
