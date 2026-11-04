import sharp from 'sharp';
import { beforeAll, describe, expect, it } from 'vitest';
import { testImages, type TestImages } from '../../test/support/images';
import { AppError } from '../common/app-error';
import { checkImage, normalizePhoto } from './image-check';

let images: TestImages;

beforeAll(async () => {
  images = await testImages();
});

async function refusal(data: Buffer): Promise<AppError> {
  const error = await checkImage(data).then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(AppError);
  return error as AppError;
}

describe('checkImage', () => {
  it('recognises JPEG, PNG and WebP by their bytes', async () => {
    expect(await checkImage(images.jpeg)).toEqual({ mime: 'image/jpeg' });
    expect(await checkImage(images.png)).toEqual({ mime: 'image/png' });
    expect(await checkImage(images.webp)).toEqual({ mime: 'image/webp' });
  });

  it('refuses HTML, SVG and anything that only starts like a JPEG with 415 UNSUPPORTED_MEDIA', async () => {
    for (const data of [images.htmlAsJpeg, images.svg, images.fakeJpeg, Buffer.alloc(0)]) {
      expect(await refusal(data)).toMatchObject({ code: 'UNSUPPORTED_MEDIA', status: 415 });
    }
  });

  it('refuses a picture with too many pixels (a decompression bomb) with 413', async () => {
    const huge = await sharp({ create: { width: 10_000, height: 8_000, channels: 3, background: '#fff' } }).png().toBuffer();
    expect(await refusal(huge)).toMatchObject({ code: 'PAYLOAD_TOO_LARGE', status: 413 });
  });
});

describe('normalizePhoto', () => {
  it('strips every metadata, the GPS position included', async () => {
    expect((await sharp(images.jpegWithGps).metadata()).exif).toBeDefined();
    const photo = await normalizePhoto(images.jpegWithGps);
    const meta = await sharp(photo.data).metadata();
    expect(meta.exif).toBeUndefined();
    expect(meta.xmp).toBeUndefined();
    expect(meta.format).toBe('webp');
  });

  it('shrinks the long side to 2048 px, never enlarges, and reports the result', async () => {
    const big = await normalizePhoto(images.bigJpeg);
    expect(big).toMatchObject({ width: 2048, height: 1365, format: 'webp', bytes: big.data.length });
    const small = await normalizePhoto(images.png);
    expect(small).toMatchObject({ width: 400, height: 300 });
  });

  it('turns a photo upright by its EXIF orientation before the EXIF goes', async () => {
    const sideways = await sharp(images.jpeg).withMetadata({ orientation: 6 }).jpeg().toBuffer();
    expect((await sharp(sideways).metadata()).orientation).toBe(6);
    expect(await normalizePhoto(sideways)).toMatchObject({ width: 600, height: 800 });
  });
});
