import { describe, expect, it, vi } from 'vitest';
import { applyThemeInstantly, shouldAnimateThemeChange } from './switch-theme';

describe('shouldAnimateThemeChange', () => {
  it('animates only when motion is allowed and View Transitions are supported', () => {
    expect(shouldAnimateThemeChange(false, true)).toBe(true);
  });

  it('never animates for people who prefer reduced motion', () => {
    expect(shouldAnimateThemeChange(true, true)).toBe(false);
    expect(shouldAnimateThemeChange(true, false)).toBe(false);
  });

  it('falls back to an instant switch without View Transitions', () => {
    expect(shouldAnimateThemeChange(false, false)).toBe(false);
  });
});

describe('applyThemeInstantly', () => {
  it('turns every CSS transition off while the theme lands, then back on the next frame (no half-way colours)', () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
    const html = document.documentElement;
    let during: boolean | null = null;
    applyThemeInstantly(() => {
      html.dataset['theme'] = 'dark';
      during = html.hasAttribute('data-theme-instant');
    });
    expect(during).toBe(true);
    expect(html.dataset['theme']).toBe('dark');
    frames.splice(0).forEach((cb) => cb(0));
    frames.splice(0).forEach((cb) => cb(0));
    expect(html.hasAttribute('data-theme-instant')).toBe(false);
    vi.unstubAllGlobals();
  });
});
