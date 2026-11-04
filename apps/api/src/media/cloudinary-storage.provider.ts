import { createHash } from 'node:crypto';
import { Logger } from '@nestjs/common';
import { AppError } from '../common/app-error';
import { MAX_SIDE, normalizePhoto } from './image-check';
import type { PhotoMime, PhotoVariant, StorageProvider, StoredPhoto } from './storage.provider';

export interface CloudinaryCredentials {
  cloud: string;
  apiKey: string;
  apiSecret: string;
}

/** `cloudinary://<api_key>:<api_secret>@<cloud_name>`, the format Cloudinary's console shows. */
export function parseCloudinaryUrl(value: string): CloudinaryCredentials {
  const match = /^cloudinary:\/\/([^:@/\s]+):([^:@/\s]+)@([^:@/\s]+)$/.exec(value);
  if (!match) throw new Error('CLOUDINARY_URL must look like cloudinary://<api_key>:<api_secret>@<cloud_name>');
  return { apiKey: match[1]!, apiSecret: match[2]!, cloud: match[3]! };
}

const FOLDER = 'yoyo/listings';
const DELIVERY = 'https://res.cloudinary.com';
const TIMEOUT_MS = 30_000;

/** Upload-time transformation: Cloudinary stores at most 2048 px on the long side, metadata dropped. */
const INCOMING = `c_limit,w_${MAX_SIDE},h_${MAX_SIDE}`;

const VARIANTS: Record<PhotoVariant, string> = {
  thumb: 'f_auto,q_auto,c_fill,w_160,h_120',
  card: 'f_auto,q_auto,c_fill,w_640,h_480',
  full: `f_auto,q_auto,c_limit,w_${MAX_SIDE},h_${MAX_SIDE}`,
};

/** Cloudinary's signature: SHA-1 of the sorted `key=value` pairs joined by `&`, followed by the secret. */
export function sign(params: Record<string, string>, secret: string): string {
  const signed = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return createHash('sha1').update(signed + secret).digest('hex');
}

/**
 * Photos on Cloudinary, through its REST API (no SDK), every request signed. The photo is cleaned
 * and shrunk here first (normalizePhoto), so the original with its GPS position never leaves the
 * server; Cloudinary limits it to 2048 px again on upload and serves the three sizes.
 */
export class CloudinaryStorageProvider implements StorageProvider {
  readonly enabled = true;
  private readonly logger = new Logger('Storage');
  private readonly apiUrl: string;

  constructor(
    private readonly credentials: CloudinaryCredentials,
    options: { apiUrl?: string } = {},
  ) {
    this.apiUrl = (options.apiUrl ?? 'https://api.cloudinary.com').replace(/\/$/, '');
  }

  async put(key: string, data: Buffer, _mime: PhotoMime): Promise<StoredPhoto> {
    const photo = await normalizePhoto(data);
    const answer = await this.call<{ public_id?: string; width?: number; height?: number; bytes?: number; format?: string }>(
      'upload',
      { folder: FOLDER, public_id: key, transformation: INCOMING },
      photo.data,
    );
    if (answer.public_id !== `${FOLDER}/${key}`) {
      this.logger.error(`Cloudinary stored ${key} as "${answer.public_id}", expected "${FOLDER}/${key}" (check the folder mode)`);
      await this.delete(key).catch(() => undefined);
      throw new AppError('STORAGE_DISABLED', 503, 'Photo storage is not available right now');
    }
    return {
      width: answer.width ?? photo.width,
      height: answer.height ?? photo.height,
      bytes: answer.bytes ?? photo.bytes,
      format: answer.format ?? photo.format,
    };
  }

  async delete(key: string): Promise<void> {
    await this.call('destroy', { public_id: `${FOLDER}/${key}`, invalidate: 'true' });
  }

  url(key: string, variant: PhotoVariant): string {
    return `${DELIVERY}/${this.credentials.cloud}/image/upload/${VARIANTS[variant]}/${FOLDER}/${key}`;
  }

  private async call<T>(action: 'upload' | 'destroy', params: Record<string, string>, file?: Buffer): Promise<T> {
    const signed = { ...params, timestamp: String(Math.floor(Date.now() / 1000)) };
    const form = new FormData();
    if (file) form.append('file', new Blob([new Uint8Array(file)], { type: 'image/webp' }), 'photo.webp');
    for (const [name, value] of Object.entries(signed)) form.append(name, value);
    form.append('api_key', this.credentials.apiKey);
    form.append('signature', sign(signed, this.credentials.apiSecret));

    let res: Response;
    try {
      res = await fetch(`${this.apiUrl}/v1_1/${this.credentials.cloud}/image/${action}`, {
        method: 'POST',
        body: form,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      this.logger.error(`Cloudinary ${action} failed: ${error instanceof Error ? error.message : String(error)}`);
      throw new AppError('STORAGE_DISABLED', 503, 'Photo storage is not available right now');
    }
    const body = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
    if (!res.ok) {
      this.logger.error(`Cloudinary ${action} answered ${res.status}: ${body.error?.message ?? 'no message'}`);
      throw new AppError('STORAGE_DISABLED', 503, 'Photo storage is not available right now');
    }
    return body;
  }
}
