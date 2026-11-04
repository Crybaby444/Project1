import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import sharp from 'sharp';
import { normalizePhoto } from './image-check';
import type { PhotoMime, PhotoVariant, StorageProvider, StoredPhoto } from './storage.provider';

/** Storage keys are UUIDs; anything else never reaches the file system. */
export const STORAGE_KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const CROPS: Record<Exclude<PhotoVariant, 'full'>, { width: number; height: number }> = {
  thumb: { width: 160, height: 120 },
  card: { width: 640, height: 480 },
};

/**
 * Photos in a folder on this server (`UPLOADS_DIR`, by default apps/api/.uploads), for development
 * and tests. Each photo is stored once, cleaned and shrunk (normalizePhoto); the smaller sizes are
 * made on the first request and kept next to it. Served by GET /api/v1/media/:key/:variant.
 */
export class LocalStorageProvider implements StorageProvider {
  readonly enabled = true;
  private readonly dir: string;

  constructor(dir: string) {
    this.dir = resolve(dir);
  }

  /** The stored file of a photo (tests read it to check what was kept). */
  pathOf(key: string, variant: PhotoVariant = 'full'): string {
    if (!STORAGE_KEY.test(key)) throw new Error('invalid storage key');
    return join(this.dir, variant === 'full' ? `${key}.webp` : `${key}.${variant}.webp`);
  }

  async put(key: string, data: Buffer, _mime: PhotoMime): Promise<StoredPhoto> {
    const photo = await normalizePhoto(data);
    await mkdir(this.dir, { recursive: true });
    await writeFile(this.pathOf(key), photo.data);
    return { width: photo.width, height: photo.height, bytes: photo.bytes, format: photo.format };
  }

  async delete(key: string): Promise<void> {
    await Promise.all((['full', 'thumb', 'card'] as const).map((variant) => rm(this.pathOf(key, variant), { force: true })));
  }

  url(key: string, variant: PhotoVariant): string {
    return `/api/v1/media/${key}/${variant}`;
  }

  /** One size of a stored photo, or null when there is no such photo. */
  async read(key: string, variant: PhotoVariant): Promise<Buffer | null> {
    if (!STORAGE_KEY.test(key)) return null;
    if (variant !== 'full') {
      const cached = await readFile(this.pathOf(key, variant)).catch(() => null);
      if (cached) return cached;
    }
    const original = await readFile(this.pathOf(key)).catch(() => null);
    if (!original || variant === 'full') return original;
    const crop = await sharp(original).resize({ ...CROPS[variant], fit: 'cover' }).webp({ quality: 80 }).toBuffer();
    await writeFile(this.pathOf(key, variant), crop);
    return crop;
  }
}
