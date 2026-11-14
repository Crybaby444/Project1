import { render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { stubMatchMedia } from '@/test/match-media';
import { DropCursor } from './DropCursor';
import { fillPoints, headRadius, moved } from './drop-cursor';

const rect = (left: number, top: number, width: number, height: number) =>
  ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top }) as DOMRect;

describe('headRadius', () => {
  it('is a small drop at rest', () => {
    expect(headRadius(0, 0, 0)).toBe(9);
  });

  it('swells with speed, up to a cap', () => {
    expect(headRadius(5000, 0, 0)).toBe(31);
    expect(headRadius(100_000, 0, 0)).toBe(31);
  });

  it('melts into the fill over something clickable', () => {
    expect(headRadius(0, 1, 0)).toBeCloseTo(1.35);
  });

  it('splashes on a click', () => {
    expect(headRadius(0, 0, 1)).toBe(29);
  });
});

describe('fillPoints', () => {
  it('lays five drops along the middle of the element, inside it', () => {
    const r = rect(100, 200, 240, 50);
    const pts = fillPoints(r, 5, 1, 26);
    expect(pts).toHaveLength(5);
    for (const p of pts) {
      expect(p.y).toBe(225);
      expect(p.x).toBeGreaterThan(r.left);
      expect(p.x).toBeLessThan(r.right);
      expect(p.r).toBeCloseTo(25 * 0.68);
    }
  });

  it('has nothing to fill when not hovering', () => {
    expect(fillPoints(rect(0, 0, 100, 40), 5, 0, 0).every((p) => p.r === 0)).toBe(true);
  });
});

describe('moved', () => {
  it('says a frame can be skipped when nothing has moved more than a twentieth of a pixel', () => {
    const a = new Float32Array([10, 20, 9, 30, 40, 5]);
    expect(moved(a, new Float32Array([10.01, 20, 9, 30, 40.02, 5]))).toBe(false);
    expect(moved(a, new Float32Array([10, 20, 9.3, 30, 40, 5]))).toBe(true);
  });
});

describe('DropCursor', () => {
  afterEach(() => {
    stubMatchMedia(false);
    delete (navigator as { webdriver?: boolean }).webdriver;
  });

  it('stays off under automation (no GPU in CI: a full-screen shader every frame starves the tests)', () => {
    const base = window.matchMedia;
    window.matchMedia = (q: string) => ({ ...base(q), matches: q.includes('pointer: fine') }) as MediaQueryList;
    const on = render(<DropCursor />);
    expect(on.container.querySelector('canvas'), 'a mouse gets the drop').not.toBeNull();
    on.unmount();
    Object.defineProperty(navigator, 'webdriver', { value: true, configurable: true });
    const { container } = render(<DropCursor />);
    expect(container.querySelector('canvas')).toBeNull();
  });

  it('is not drawn on a touch screen', () => {
    stubMatchMedia(false); // (pointer: fine) answers false in the stub
    const { container } = render(<DropCursor />);
    expect(container.querySelector('canvas')).toBeNull();
  });
});
