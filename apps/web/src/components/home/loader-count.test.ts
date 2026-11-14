import { afterEach, describe, expect, it, vi } from 'vitest';
import { loaderCountScript } from './loader-count';

describe('loaderCountScript (the home loader’s count, run from <head>)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('counts 0 → 100 through the numbers between in 1.1 s, in any browser (no CSS counter animation)', () => {
    let now = 0;
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('performance', { now: () => now });
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
    new Function(loaderCountScript)();
    document.body.innerHTML = '<div data-home-loader><b class="home-loader-count">0</b></div>';
    const seen: number[] = [];
    for (let t = 0; t <= 1300; t += 50) {
      now = t;
      frames.splice(0).forEach((cb) => cb(now));
      seen.push(Number(document.querySelector('.home-loader-count')!.textContent));
    }
    expect(seen.at(-1)).toBe(100);
    expect(new Set(seen.filter((v) => v > 0 && v < 100)).size).toBeGreaterThan(8);
    expect(seen.every((v, i) => i === 0 || v >= seen[i - 1]!)).toBe(true);
  });
});
