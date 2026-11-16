import { describe, expect, it } from 'vitest';
import { dotGrid, dotScale, shouldFlood } from './dot-flood';

describe('dotGrid', () => {
  it('covers the whole screen with a staggered grid, the delay growing with the distance from the origin', () => {
    const dots = dotGrid(400, 300, { x: 0, y: 0 }, () => 0);
    expect(dots.length).toBeGreaterThan(100);
    const near = dots.find((d) => d.x === 0 && d.y === 0)!;
    const far = dots.reduce((a, b) => (a.x + a.y > b.x + b.y ? a : b));
    expect(near.delay).toBe(0);
    expect(far.delay).toBeGreaterThan(0.4);
    expect(Math.max(...dots.map((d) => d.x))).toBeGreaterThanOrEqual(400);
    expect(Math.max(...dots.map((d) => d.y))).toBeGreaterThanOrEqual(300);
  });
});

describe('dotScale', () => {
  it('grows each dot from nothing to full after its own delay when covering', () => {
    expect(dotScale(0, 0.2, 'cover')).toBe(0);
    expect(dotScale(0.2, 0.2, 'cover')).toBe(0);
    expect(dotScale(1, 0.2, 'cover')).toBe(1);
    expect(dotScale(0.35, 0.2, 'cover')).toBeGreaterThan(0);
  });

  it('shrinks them away the same way when revealing', () => {
    expect(dotScale(0, 0.2, 'reveal')).toBe(1);
    expect(dotScale(1, 0.2, 'reveal')).toBe(0);
  });
});

describe('shouldFlood', () => {
  const base = { reducedMotion: false, automated: false, samePage: false, plainClick: true, sameOrigin: true, language: false, optOut: false };
  it('floods a plain click to another page of the site', () => {
    expect(shouldFlood(base)).toBe(true);
  });
  it('leaves alone anything else: reduced motion, tests, the same page, new tabs, other sites, language links, opt-outs', () => {
    for (const k of ['reducedMotion', 'automated', 'samePage', 'language', 'optOut'] as const) expect(shouldFlood({ ...base, [k]: true })).toBe(false);
    for (const k of ['plainClick', 'sameOrigin'] as const) expect(shouldFlood({ ...base, [k]: false })).toBe(false);
  });
});
