import { afterEach, describe, expect, it, vi } from 'vitest';
import * as edit from '@/lib/listings/image-edit';
import { shrinkPhoto, UnreadablePhotoError } from './shrink';

describe('shrinkPhoto (owner, 2026-11-16: big phone photos did not send)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('redraws the whole photo at most 2048 px wide', async () => {
    const small = new Blob(['jpeg'], { type: 'image/jpeg' });
    const close = vi.fn();
    vi.spyOn(edit, 'loadImage').mockResolvedValue({ source: {} as CanvasImageSource, size: { width: 4032, height: 3024 }, close });
    const render = vi.spyOn(edit, 'renderCrop').mockResolvedValue(small);
    expect(await shrinkPhoto(new Blob([new Uint8Array(6_000_000)]))).toBe(small);
    expect(render.mock.calls[0]![1]).toEqual({ x: 0, y: 0, width: 4032, height: 3024 });
    expect(close).toHaveBeenCalled();
  });

  it('sends a small photo the browser cannot open as it is, and refuses a big one', async () => {
    vi.spyOn(edit, 'loadImage').mockRejectedValue(new Error('no'));
    const tiny = new Blob(['x']);
    expect(await shrinkPhoto(tiny)).toBe(tiny);
    await expect(shrinkPhoto(new Blob([new Uint8Array(5_000_000)]))).rejects.toBeInstanceOf(UnreadablePhotoError);
  });
});
