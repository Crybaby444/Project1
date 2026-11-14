import { describe, expect, it } from 'vitest';
import { shouldRelayout } from './relayout';

describe('shouldRelayout', () => {
  it('ignores a phone whose height changes because the browser bar hides or shows', () => {
    expect(shouldRelayout({ w: 390, h: 664 }, { w: 390, h: 750 }, true)).toBe(false);
  });

  it('lays out again when a phone turns (the width changes)', () => {
    expect(shouldRelayout({ w: 390, h: 750 }, { w: 844, h: 390 }, true)).toBe(true);
  });

  it('follows every real resize on a desktop', () => {
    expect(shouldRelayout({ w: 1280, h: 800 }, { w: 1280, h: 700 }, false)).toBe(true);
    expect(shouldRelayout({ w: 1280, h: 800 }, { w: 1280, h: 800 }, false)).toBe(false);
  });
});
