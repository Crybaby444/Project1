import { describe, expect, it } from 'vitest';
import {
  clampCrop,
  fitCrop,
  moveCrop,
  outputSize,
  rotatedSize,
  rotationMatrix,
  sniffImage,
  zoomCrop,
} from './image-edit';

describe('crop geometry', () => {
  it('starts with the largest 4:3 frame in the middle', () => {
    expect(fitCrop({ width: 4000, height: 3000 }, 0)).toEqual({ x: 0, y: 0, width: 4000, height: 3000 });
    expect(fitCrop({ width: 3000, height: 4000 }, 0)).toEqual({ x: 0, y: 875, width: 3000, height: 2250 });
    expect(fitCrop({ width: 2000, height: 1000 }, 0)).toEqual({
      x: (2000 - 1333.3333333333333) / 2,
      y: 0,
      width: 1333.3333333333333,
      height: 1000,
    });
  });

  it('swaps the sides of a photo turned by 90 or 270 degrees', () => {
    expect(rotatedSize({ width: 3000, height: 4000 }, 90)).toEqual({ width: 4000, height: 3000 });
    expect(fitCrop({ width: 3000, height: 4000 }, 270)).toEqual({ x: 0, y: 0, width: 4000, height: 3000 });
    expect(rotatedSize({ width: 3000, height: 4000 }, 180)).toEqual({ width: 3000, height: 4000 });
  });

  it('never moves the frame off the photo', () => {
    const image = { width: 3000, height: 4000 };
    const crop = fitCrop(image, 0);
    expect(moveCrop(crop, image, 0, -10_000, 10_000)).toEqual({ ...crop, y: 4000 - 2250 });
    expect(moveCrop(crop, image, 0, 0, -10_000)).toEqual({ ...crop, y: 0 });
    expect(clampCrop({ x: -5, y: 3999, width: 3000, height: 2250 }, image, 0)).toEqual({
      x: 0,
      y: 1750,
      width: 3000,
      height: 2250,
    });
  });

  it('zooms around the middle of the frame, between 1× and 8×', () => {
    const image = { width: 4000, height: 3000 };
    const crop = fitCrop(image, 0);
    expect(zoomCrop(crop, image, 0, 2)).toEqual({ x: 1000, y: 750, width: 2000, height: 1500 });
    expect(zoomCrop(crop, image, 0, 0.5)).toEqual(crop);
    expect(zoomCrop(crop, image, 0, 100).width).toBe(500);
  });

  it('keeps the long side of the result at most 2048 px', () => {
    expect(outputSize({ x: 0, y: 0, width: 4000, height: 3000 })).toEqual({ width: 2048, height: 1536 });
    expect(outputSize({ x: 0, y: 0, width: 800, height: 600 })).toEqual({ width: 800, height: 600 });
  });

  it('maps the corners of the photo to the right corners after turning it', () => {
    const apply = ([a, b, c, d, e, f]: number[], x: number, y: number) => [
      a! * x + c! * y + e!,
      b! * x + d! * y + f!,
    ];
    // A 300×400 photo turned right: its top-left corner lands top-right of the 400×300 result.
    expect(apply(rotationMatrix(90, { width: 300, height: 400 }), 0, 0)).toEqual([400, 0]);
    expect(apply(rotationMatrix(270, { width: 300, height: 400 }), 0, 0)).toEqual([0, 300]);
    expect(apply(rotationMatrix(180, { width: 300, height: 400 }), 300, 400).map(Math.round)).toEqual([0, 0]);
  });
});

describe('sniffImage', () => {
  const blob = (bytes: number[]) => new Blob([new Uint8Array([...bytes, ...Array(16).fill(0)])]);
  it('knows JPEG, PNG and WebP by their first bytes, whatever the name or type says', async () => {
    expect(await sniffImage(blob([0xff, 0xd8, 0xff]))).toBe('image/jpeg');
    expect(await sniffImage(blob([0x89, 0x50, 0x4e, 0x47]))).toBe('image/png');
    expect(await sniffImage(blob([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50]))).toBe(
      'image/webp',
    );
    expect(
      await sniffImage(new Blob(['<svg xmlns="http://www.w3.org/2000/svg"/>'], { type: 'image/jpeg' })),
    ).toBeNull();
  });
});
