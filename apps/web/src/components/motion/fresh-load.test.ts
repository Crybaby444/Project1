import { afterEach, describe, expect, it, vi } from 'vitest';
import { FRESH_LOAD_MS, freshLoadScript } from './fresh-load';

afterEach(() => {
  vi.useRealTimers();
  document.documentElement.removeAttribute('data-fresh');
});

describe('freshLoadScript', () => {
  it('marks a fresh load, then clears the mark a little after the page has loaded', () => {
    vi.useFakeTimers();
    new Function(freshLoadScript)();
    expect(document.documentElement).toHaveAttribute('data-fresh');
    // jsdom is already "complete": the clock starts at once.
    vi.advanceTimersByTime(FRESH_LOAD_MS - 1);
    expect(document.documentElement).toHaveAttribute('data-fresh');
    vi.advanceTimersByTime(1);
    expect(document.documentElement).not.toHaveAttribute('data-fresh');
  });
});
