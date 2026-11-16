/**
 * The dot flood (owner, 2026-11-16: the loader's flood of dots, on every page change). On a click to
 * another page, night dots grow from the click outward until they cover the screen; when the new page is
 * there, they shrink away from the middle and show it. Drawn on one canvas above everything.
 */

export type Dot = { x: number; y: number; delay: number };
export type Phase = 'cover' | 'reveal';

/** The night of the flood, the same in both themes. */
export const FLOOD_COLOR = '#0a0b0e';
const COVER_MS = 520;
const REVEAL_MS = 620;
/** Each dot takes this share of the run to grow or shrink. */
const SPAN = 0.4;

/** A staggered grid over the screen; each dot starts later the farther it is from `origin`. */
export function dotGrid(width: number, height: number, origin: { x: number; y: number }, random: () => number = Math.random): Dot[] {
  const sp = width < 640 ? 26 : 34;
  const rows = Math.ceil(height / (sp * 0.866)) + 2;
  const cols = Math.ceil(width / sp) + 2;
  const maxD = Math.max(
    Math.hypot(origin.x, origin.y),
    Math.hypot(width - origin.x, origin.y),
    Math.hypot(origin.x, height - origin.y),
    Math.hypot(width - origin.x, height - origin.y),
  );
  const dots: Dot[] = [];
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const x = i * sp + ((j % 2) * sp) / 2;
      const y = j * sp * 0.866;
      dots.push({ x, y, delay: (Math.hypot(x - origin.x, y - origin.y) / maxD) * (1 - SPAN) * 0.92 + random() * 0.06 });
    }
  return dots;
}

/** How big a dot is (0..1 of its full size) at time `t` (0..1 of the run). */
export function dotScale(t: number, delay: number, phase: Phase): number {
  const k = Math.min(1, Math.max(0, (t - delay) / SPAN));
  const eased = 1 - Math.pow(1 - k, 3);
  return phase === 'cover' ? eased : 1 - eased;
}

/**
 * The big part of the site a path belongs to: its first segment after the language (`/lv/c/tools` → `c`,
 * `/dashboard/favorites` → `dashboard`, `/` → ``). Moving inside one part is not a change of place.
 */
export function sectionOf(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] && /^[a-z]{2}$/.test(parts[0])) parts.shift();
  return parts[0] ?? '';
}

/** Whether a click should run the flood. */
export function shouldFlood(c: {
  reducedMotion: boolean;
  automated: boolean;
  samePage: boolean;
  plainClick: boolean;
  sameOrigin: boolean;
  language: boolean;
  optOut: boolean;
  /** Owner, 2026-11-16: only between big parts (home, catalog, profile, deals…), not inside one. */
  sameSection?: boolean;
}): boolean {
  return c.plainClick && c.sameOrigin && !c.samePage && !c.sameSection && !c.language && !c.optOut && !c.reducedMotion && !c.automated;
}

/** One flood on a canvas above the page: `cover` from a point, then `reveal`; `remove` drops the canvas. */
export function createFlood(): { cover(origin: { x: number; y: number }): Promise<void>; reveal(): Promise<void>; remove(): void } {
  const c = document.createElement('canvas');
  c.setAttribute('aria-hidden', 'true');
  c.dataset.dotFlood = '';
  c.style.cssText = 'position:fixed;inset:0;z-index:200;width:100%;height:100%;pointer-events:none';
  document.body.append(c);
  const g = c.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = innerWidth;
  const H = innerHeight;
  c.width = W * dpr;
  c.height = H * dpr;
  g?.scale(dpr, dpr);
  const sp = W < 640 ? 26 : 34;
  let dots: Dot[] = [];

  const run = (phase: Phase, ms: number) =>
    new Promise<void>((done) => {
      if (!g) return done();
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / ms);
        g.clearRect(0, 0, W, H);
        g.fillStyle = FLOOD_COLOR;
        g.beginPath();
        for (const d of dots) {
          const r = sp * 0.66 * dotScale(t, d.delay, phase);
          if (r <= 0) continue;
          g.moveTo(d.x + r, d.y);
          g.arc(d.x, d.y, r, 0, Math.PI * 2);
        }
        g.fill();
        if (t < 1) requestAnimationFrame(step);
        else done();
      };
      requestAnimationFrame(step);
    });

  return {
    cover(origin) {
      dots = dotGrid(W, H, origin);
      return run('cover', COVER_MS);
    },
    reveal() {
      dots = dotGrid(W, H, { x: W / 2, y: H / 2 });
      return run('reveal', REVEAL_MS).then(() => c.remove());
    },
    remove() {
      c.remove();
    },
  };
}
