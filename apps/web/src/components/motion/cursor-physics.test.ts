import { describe, expect, it } from 'vitest';
import { hoverTarget, spring, stepSpring, stepTail, stretch } from './cursor-physics';

const rect = (left: number, top: number, width: number, height: number) =>
  ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top }) as DOMRect;

describe('stepSpring', () => {
  it('reaches its target quickly with only a small overshoot (a liquid follow, not a lag)', () => {
    const s = spring(0);
    let peak = 0;
    let settledAt = -1;
    for (let i = 1; i <= 120; i++) {
      stepSpring(s, 100, 1 / 120, 900, 0.72);
      peak = Math.max(peak, s.x);
      if (settledAt < 0 && Math.abs(s.x - 100) < 0.5 && Math.abs(s.v) < 5) settledAt = i / 120;
    }
    expect(peak).toBeGreaterThan(100);
    expect(peak).toBeLessThan(115);
    expect(settledAt).toBeGreaterThan(0);
    expect(settledAt).toBeLessThan(0.6);
  });

  it('stays stable with a long frame (sub-steps)', () => {
    const s = spring(0);
    stepSpring(s, 100, 0.25, 900, 0.72);
    expect(Number.isFinite(s.x)).toBe(true);
    expect(Math.abs(s.x)).toBeLessThan(200);
  });
});

describe('stretch', () => {
  it('is round at rest and long along the motion when fast, keeping its area', () => {
    expect(stretch(0)).toEqual({ along: 1, across: 1 });
    const fast = stretch(2400);
    expect(fast.along).toBeGreaterThan(1.5);
    expect(fast.along * fast.across).toBeCloseTo(1, 5);
    expect(stretch(1e6).along).toBeLessThanOrEqual(2.2);
  });
});

describe('stepTail', () => {
  it('trails behind a moving head and gathers into the drop when it stops', () => {
    const tail = Array.from({ length: 6 }, () => ({ x: 0, y: 0 }));
    for (let i = 0; i < 10; i++) stepTail(tail, { x: i * 20, y: 0 }, 1 / 60);
    expect(tail[5]!.x).toBeLessThan(tail[0]!.x);
    for (let i = 0; i < 240; i++) stepTail(tail, { x: 200, y: 0 }, 1 / 60);
    for (const d of tail) expect(Math.hypot(d.x - 200, d.y)).toBeLessThan(0.5);
  });
});

describe('stepTail on a fling', () => {
  it('keeps the trail short and connected: no link longer than 26px', () => {
    const tail = Array.from({ length: 6 }, () => ({ x: 0, y: 0 }));
    stepTail(tail, { x: 600, y: 0 }, 1 / 60);
    let lead = { x: 600, y: 0 };
    for (const d of tail) {
      expect(Math.hypot(d.x - lead.x, d.y - lead.y)).toBeLessThanOrEqual(26.001);
      lead = d;
    }
  });
});

describe('hoverTarget', () => {
  it('takes the shape of a button, with its corner radius', () => {
    expect(hoverTarget(rect(100, 100, 140, 44), null, 22)).toEqual({ kind: 'box', cx: 170, cy: 122, hw: 70, hh: 22, r: 22 });
  });

  it('wraps only the words of a wide label or link, padded a little', () => {
    const t = hoverTarget(rect(0, 0, 900, 24), rect(10, 2, 60, 20), 0);
    expect(t).toMatchObject({ kind: 'box', cx: 40, cy: 12 });
    expect((t as { hw: number }).hw).toBeGreaterThan(30);
    expect((t as { hw: number }).hw).toBeLessThan(45);
  });

  it('becomes a ring over something too big to fill (a whole card)', () => {
    expect(hoverTarget(rect(0, 0, 320, 420), null, 14).kind).toBe('ring');
  });
});
