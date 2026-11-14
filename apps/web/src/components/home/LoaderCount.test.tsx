import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LoaderCount } from './LoaderCount';

function frames() {
  let now = 0;
  const queue: FrameRequestCallback[] = [];
  vi.stubGlobal('performance', { now: () => now });
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => queue.push(cb));
  vi.stubGlobal('cancelAnimationFrame', () => {});
  return (to: number) => {
    for (let t = now; t <= to; t += 50) {
      now = t;
      queue.splice(0).forEach((cb) => cb(now));
    }
  };
}

describe('LoaderCount', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete (window as { __homeCountEnd?: number }).__homeCountEnd;
  });

  it('leaves the number to the head script while that is still counting (no two counts fighting)', () => {
    const run = frames();
    (window as { __homeCountEnd?: number }).__homeCountEnd = 1100;
    const { container } = render(<LoaderCount />);
    run(400);
    expect(container.querySelector('.home-loader-count')!.textContent).toBe('0');
  });

  it('counts 0 → 100 itself when the page came without a fresh document (a language switch)', () => {
    const run = frames();
    const { container } = render(<LoaderCount />);
    const b = container.querySelector('.home-loader-count')!;
    const seen = new Set<string>();
    for (let t = 0; t <= 1300; t += 100) {
      run(t);
      seen.add(b.textContent ?? '');
    }
    expect(b.textContent).toBe('100');
    expect(seen.size).toBeGreaterThan(6);
  });
});
