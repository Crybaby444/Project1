import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startFakeCloudinary, type FakeCloudinary } from '../../test/support/fake-cloudinary';
import { testImages, type TestImages } from '../../test/support/images';
import { CloudinaryStorageProvider, parseCloudinaryUrl } from './cloudinary-storage.provider';

describe('CloudinaryStorageProvider', () => {
  let cloudinary: FakeCloudinary;
  let images: TestImages;
  let provider: CloudinaryStorageProvider;

  beforeAll(async () => {
    cloudinary = await startFakeCloudinary();
    images = await testImages();
    provider = new CloudinaryStorageProvider(parseCloudinaryUrl(cloudinary.url), { apiUrl: cloudinary.apiUrl });
  });

  afterAll(async () => {
    await cloudinary.close();
  });

  it('reads key, secret and cloud from CLOUDINARY_URL', () => {
    expect(parseCloudinaryUrl('cloudinary://123:abc-DEF_9@my-cloud')).toEqual({ apiKey: '123', apiSecret: 'abc-DEF_9', cloud: 'my-cloud' });
    expect(() => parseCloudinaryUrl('https://123:abc@my-cloud')).toThrow();
    expect(() => parseCloudinaryUrl('cloudinary://my-cloud')).toThrow();
  });

  it('uploads a signed request into yoyo/listings, already cleaned of metadata and limited to 2048 px', async () => {
    const meta = await provider.put('photo-1', images.jpegWithGps, 'image/jpeg');

    const upload = cloudinary.uploads.get('yoyo/listings/photo-1')!;
    expect(upload.params).toMatchObject({
      public_id: 'photo-1',
      folder: 'yoyo/listings',
      api_key: cloudinary.apiKey,
      transformation: 'c_limit,w_2048,h_2048',
      timestamp: expect.stringMatching(/^\d+$/),
    });
    expect(cloudinary.badSignatures).toBe(0);
    expect((await sharp(upload.file).metadata()).exif).toBeUndefined();
    expect(meta).toEqual({ width: 1200, height: 900, bytes: upload.file.length, format: 'webp' });
  });

  it('builds delivery URLs for the three sizes', () => {
    const base = `https://res.cloudinary.com/${cloudinary.cloud}/image/upload`;
    expect(provider.url('photo-1', 'thumb')).toBe(`${base}/f_auto,q_auto,c_fill,w_160,h_120/yoyo/listings/photo-1`);
    expect(provider.url('photo-1', 'card')).toBe(`${base}/f_auto,q_auto,c_fill,w_640,h_480/yoyo/listings/photo-1`);
    expect(provider.url('photo-1', 'full')).toBe(`${base}/f_auto,q_auto,c_limit,w_2048,h_2048/yoyo/listings/photo-1`);
  });

  it('deletes with a signed destroy request', async () => {
    await provider.put('photo-2', images.png, 'image/png');
    await provider.delete('photo-2');
    expect(cloudinary.destroyed).toContain('yoyo/listings/photo-2');
    expect(cloudinary.uploads.has('yoyo/listings/photo-2')).toBe(false);
    expect(cloudinary.badSignatures).toBe(0);
  });

  it('fails when Cloudinary refuses the request (a wrong secret, say)', async () => {
    const wrong = new CloudinaryStorageProvider({ ...parseCloudinaryUrl(cloudinary.url), apiSecret: 'nope' }, { apiUrl: cloudinary.apiUrl });
    await expect(wrong.put('photo-3', images.png, 'image/png')).rejects.toMatchObject({ code: 'STORAGE_DISABLED', status: 503 });
    expect(cloudinary.badSignatures).toBe(1);
  });
});
