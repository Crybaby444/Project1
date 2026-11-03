import { describe, expect, it } from 'vitest';
import { shouldAnimateThemeChange } from './switch-theme';

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
