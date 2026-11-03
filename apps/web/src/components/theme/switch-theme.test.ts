import { describe, expect, it, vi } from 'vitest';
import { revealRadius, shouldAnimateThemeChange, switchTheme } from './switch-theme';

describe('shouldAnimateThemeChange', () => {
  it('animates only with View Transitions and without reduced motion', () => {
    expect(shouldAnimateThemeChange(false, true)).toBe(true);
    expect(shouldAnimateThemeChange(true, true)).toBe(false);
    expect(shouldAnimateThemeChange(false, false)).toBe(false);
  });
});

describe('revealRadius', () => {
  it('reaches the farthest viewport corner from the origin', () => {
    expect(revealRadius({ x: 0, y: 0 }, { width: 300, height: 400 })).toBe(500);
    expect(revealRadius({ x: 300, y: 400 }, { width: 300, height: 400 })).toBe(500);
    expect(revealRadius({ x: 150, y: 200 }, { width: 300, height: 400 })).toBe(250);
  });
});

describe('switchTheme', () => {
  it('applies immediately without animation when animate is false', () => {
    const apply = vi.fn();
    switchTheme(apply, { x: 10, y: 10 }, false);
    expect(apply).toHaveBeenCalledOnce();
  });
});
