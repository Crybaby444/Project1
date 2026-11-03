import { shouldAnimateThemeChange, switchTheme } from './switch-theme';

describe('shouldAnimateThemeChange', () => {
  it('animates only with View Transitions and without reduced motion', () => {
    expect(shouldAnimateThemeChange(false, true)).toBe(true);
    expect(shouldAnimateThemeChange(true, true)).toBe(false);
    expect(shouldAnimateThemeChange(false, false)).toBe(false);
    expect(shouldAnimateThemeChange(true, false)).toBe(false);
  });
});

describe('switchTheme', () => {
  it('applies the change immediately when not animating', () => {
    const apply = vi.fn();
    switchTheme(apply, { x: 10, y: 10 }, false);
    expect(apply).toHaveBeenCalledOnce();
  });
});
