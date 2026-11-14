/**
 * The drop cursor's physics (DropCursor.tsx), pure so it can be tested without WebGL. Units are CSS
 * pixels and seconds.
 */

export type Spring = { x: number; v: number };

export const spring = (x: number): Spring => ({ x, v: 0 });

/**
 * One damped spring towards `target` over `dt`, in fixed sub-steps so a long frame stays stable.
 * `k` is the stiffness, `zeta` the damping ratio (below 1 overshoots a little: a liquid follow).
 */
export function stepSpring(s: Spring, target: number, dt: number, k: number, zeta: number): void {
  const c = 2 * Math.sqrt(k) * zeta;
  const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
  const h = Math.min(dt, 0.25) / steps;
  for (let i = 0; i < steps; i++) {
    s.v += (k * (target - s.x) - c * s.v) * h;
    s.x += s.v * h;
  }
}

/**
 * How far the drop stretches along its motion at `speed` px/s, keeping its area (along × across = 1):
 * round at rest, up to 2.2 times longer when flung.
 */
export function stretch(speed: number): { along: number; across: number } {
  const along = 1 + Math.min(1.2, (speed / 2400) * 0.9);
  return { along, across: 1 / along };
}

export type Point = { x: number; y: number };

/** The longest link of the tail, in px. */
const LINK = 26;

/**
 * The tail: each droplet follows the one before it (the first follows the head), lagging more along
 * the chain, so a fast drop pulls a liquid trail and a still one gathers it back in. Frame-rate
 * independent.
 */
export function stepTail(tail: Point[], head: Point, dt: number): void {
  tail.forEach((d, i) => {
    const lead = i === 0 ? head : tail[i - 1]!;
    const k = 1 - Math.exp(-dt * (38 - i * 3.2));
    d.x += (lead.x - d.x) * k;
    d.y += (lead.y - d.y) * k;
    // A link never stretches past LINK px, so a fling pulls a short, connected stream, not loose dots.
    const gap = Math.hypot(d.x - lead.x, d.y - lead.y);
    if (gap > LINK) {
      d.x = lead.x + ((d.x - lead.x) / gap) * LINK;
      d.y = lead.y + ((d.y - lead.y) / gap) * LINK;
    }
  });
}

export type HoverTarget =
  | { kind: 'box'; cx: number; cy: number; hw: number; hh: number; r: number }
  | { kind: 'ring'; cx: number; cy: number };

/** Larger than this the drop does not fill the element; it rings the pointer instead. */
const MAX_W = 380;
const MAX_H = 120;
const PAD = 8;

/**
 * What the drop becomes over something clickable: the element's own shape (its box and corner
 * radius); for a wide label or link only its words (`text`, padded); a ring for anything too big to
 * fill, such as a whole card.
 */
export function hoverTarget(box: DOMRect, text: DOMRect | null, radius: number): HoverTarget {
  if (box.width <= MAX_W && box.height <= MAX_H) {
    return { kind: 'box', cx: box.left + box.width / 2, cy: box.top + box.height / 2, hw: box.width / 2, hh: box.height / 2, r: Math.min(radius, box.height / 2) };
  }
  if (text && text.width > 0 && text.width + PAD * 2 <= MAX_W && text.height + PAD <= MAX_H) {
    const hh = text.height / 2 + PAD / 2;
    return { kind: 'box', cx: text.left + text.width / 2, cy: text.top + text.height / 2, hw: text.width / 2 + PAD, hh, r: hh };
  }
  return { kind: 'ring', cx: box.left + box.width / 2, cy: box.top + box.height / 2 };
}
