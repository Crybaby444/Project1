import { afterEach, describe, expect, it, vi } from 'vitest';

/** Loads image-check with a fake sharp whose decoding finishes only when the test says so. */
async function withFakeSharp() {
  const state = { active: 0, peak: 0, releases: [] as (() => void)[] };
  vi.resetModules();
  vi.doMock('sharp', () => {
    const pipeline = {
      rotate: () => pipeline,
      resize: () => pipeline,
      webp: () => pipeline,
      toBuffer: () => {
        state.active++;
        state.peak = Math.max(state.peak, state.active);
        return new Promise((resolve) =>
          state.releases.push(() => {
            state.active--;
            resolve({ data: Buffer.alloc(1), info: { width: 1, height: 1, size: 1 } });
          }),
        );
      },
    };
    return { default: Object.assign(() => pipeline, { cache: () => undefined }) };
  });
  const { normalizePhoto } = await import('./image-check.js');
  return { state, normalizePhoto };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('normalizePhoto parallelism', () => {
  afterEach(() => {
    vi.doUnmock('sharp');
    vi.resetModules();
  });

  // A newcomer may arrive at any moment while a finished job hands its slot to a waiting one.
  it.each([0, 1, 2, 3, 4, 5, 6, 8])('never decodes more than two photos at once (newcomer after %i ticks)', async (ticks) => {
    const { state, normalizePhoto } = await withFakeSharp();
    const jobs = [normalizePhoto(Buffer.alloc(1)), normalizePhoto(Buffer.alloc(1)), normalizePhoto(Buffer.alloc(1))];
    await settle();
    expect(state.active).toBe(2);

    state.releases.shift()!();
    for (let tick = 0; tick < ticks; tick++) await Promise.resolve();
    jobs.push(normalizePhoto(Buffer.alloc(1)));
    await settle();
    expect(state.active).toBeLessThanOrEqual(2);

    while (state.releases.length > 0) {
      state.releases.shift()!();
      await settle();
    }
    await Promise.all(jobs);
    expect(state.peak).toBe(2);
  });
});
