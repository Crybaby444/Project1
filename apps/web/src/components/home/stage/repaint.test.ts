import { describe, expect, it, vi } from 'vitest';
import { repaintOnThemeChange } from './repaint';

describe('repaintOnThemeChange', () => {
  it('repaints the in-scene letters when the theme flips, so YOYO takes the new ink', async () => {
    const paint = vi.fn();
    const stop = repaintOnThemeChange(paint);
    document.documentElement.dataset.theme = 'dark';
    await new Promise((r) => setTimeout(r, 0));
    expect(paint).toHaveBeenCalledTimes(1);
    stop();
    document.documentElement.dataset.theme = 'light';
    await new Promise((r) => setTimeout(r, 0));
    expect(paint).toHaveBeenCalledTimes(1);
  });
});
