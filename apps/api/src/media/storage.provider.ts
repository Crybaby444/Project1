import { Logger } from '@nestjs/common';
import type { PhotoUrls } from '@yoyo/shared';
import { AppError } from '../common/app-error';
import type { Env } from '../config/env';
import { CloudinaryStorageProvider, parseCloudinaryUrl } from './cloudinary-storage.provider';
import { LocalStorageProvider } from './local-storage.provider';

export type PhotoMime = 'image/jpeg' | 'image/png' | 'image/webp';

export type PhotoVariant = keyof PhotoUrls;

export const PHOTO_VARIANTS = ['thumb', 'card', 'full'] as const satisfies readonly PhotoVariant[];

export interface StoredPhoto {
  width: number;
  height: number;
  bytes: number;
  format: string;
}

/**
 * Where listing photos live: a local folder (development, tests) or Cloudinary (production), later
 * any S3-like service without touching the callers. `put` stores a photo already cleaned of metadata
 * and at most 2048 px on the long side; keys are random and never the user's file name.
 */
export interface StorageProvider {
  /** False when no storage is configured: uploads answer 503 STORAGE_DISABLED. */
  readonly enabled: boolean;
  put(key: string, data: Buffer, mime: PhotoMime): Promise<StoredPhoto>;
  delete(key: string): Promise<void>;
  url(key: string, variant: PhotoVariant): string;
}

/** Injection token for the StorageProvider. */
export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');

/** Production before Cloudinary is set up: the API runs, photo uploads do not. */
export class DisabledStorageProvider implements StorageProvider {
  readonly enabled = false;

  async put(): Promise<StoredPhoto> {
    throw new AppError('STORAGE_DISABLED', 503);
  }

  async delete(): Promise<void> {}

  url(): string {
    return '';
  }
}

export function createStorageProvider(env: Pick<Env, 'STORAGE' | 'CLOUDINARY_URL' | 'CLOUDINARY_API_URL' | 'UPLOADS_DIR'>): StorageProvider {
  const logger = new Logger('Storage');
  if (env.STORAGE === 'local') return new LocalStorageProvider(env.UPLOADS_DIR);
  if (env.STORAGE === 'cloudinary' && env.CLOUDINARY_URL) {
    return new CloudinaryStorageProvider(parseCloudinaryUrl(env.CLOUDINARY_URL), { apiUrl: env.CLOUDINARY_API_URL });
  }
  logger.warn(
    env.STORAGE === 'cloudinary'
      ? 'STORAGE=cloudinary but CLOUDINARY_URL is not set: photo uploads are disabled'
      : 'STORAGE is not set: photo uploads are disabled',
  );
  return new DisabledStorageProvider();
}
