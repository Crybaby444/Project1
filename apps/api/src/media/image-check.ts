import sharp from 'sharp';
import { AppError } from '../common/app-error';
import type { PhotoMime } from './storage.provider';

/** Pixels a photo may have (a 48 MP phone camera fits); more is a decompression bomb, not a photo. */
export const MAX_PIXELS = 50_000_000;

/** Long side of a stored photo. */
export const MAX_SIDE = 2048;

// Spare memory on a small server: no libvips operation cache.
sharp.cache(false);

const FORMAT_OF: Record<PhotoMime, string> = { 'image/jpeg': 'jpeg', 'image/png': 'png', 'image/webp': 'webp' };

/** The image type by its first bytes; the Content-Type and the file name are never trusted. */
function sniff(data: Buffer): PhotoMime | null {
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return 'image/jpeg';
  if (data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (data.length >= 12 && data.toString('latin1', 0, 4) === 'RIFF' && data.toString('latin1', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

const unsupported = () => new AppError('UNSUPPORTED_MEDIA', 415);

/**
 * Accepts only JPEG, PNG and WebP, recognised by their signature (`FF D8 FF`, `89 50 4E 47…`,
 * `RIFF….WEBP`), that the image library can actually open as that same format. Everything else —
 * HTML or SVG sent as `image/jpeg`, a file that only starts like a JPEG — is 415 UNSUPPORTED_MEDIA.
 * More than MAX_PIXELS is 413 PAYLOAD_TOO_LARGE.
 */
export async function checkImage(data: Buffer): Promise<{ mime: PhotoMime }> {
  const mime = sniff(data);
  if (mime === null) throw unsupported();
  let meta: sharp.Metadata;
  try {
    meta = await sharp(data, { limitInputPixels: false }).metadata();
  } catch {
    throw unsupported();
  }
  if (meta.format !== FORMAT_OF[mime] || !meta.width || !meta.height) throw unsupported();
  if (meta.width * meta.height > MAX_PIXELS) {
    throw new AppError('PAYLOAD_TOO_LARGE', 413, `The image has more than ${MAX_PIXELS / 1_000_000} megapixels`);
  }
  return { mime };
}

export interface NormalizedPhoto {
  data: Buffer;
  width: number;
  height: number;
  bytes: number;
  format: 'webp';
}

/** At most this many photos are decoded at once, so a burst of uploads cannot exhaust memory. */
const MAX_PARALLEL = 2;
let running = 0;
const waiting: (() => void)[] = [];

async function oneAtATime<T>(work: () => Promise<T>): Promise<T> {
  // A finished task hands its slot straight to the next waiter, so nobody can slip in between.
  if (running >= MAX_PARALLEL) await new Promise<void>((resolve) => waiting.push(resolve));
  else running++;
  try {
    return await work();
  } finally {
    const next = waiting.shift();
    if (next) next();
    else running--;
  }
}

/**
 * The photo as it is stored: turned upright by its EXIF orientation, the long side at most 2048 px
 * (never enlarged), re-encoded as WebP. Re-encoding drops every metadata block — EXIF with the GPS
 * position, XMP, IPTC — so nothing about where or with what it was taken is kept.
 */
export function normalizePhoto(data: Buffer): Promise<NormalizedPhoto> {
  return oneAtATime(async () => {
    const { data: out, info } = await sharp(data, { limitInputPixels: MAX_PIXELS })
      .rotate()
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    return { data: out, width: info.width, height: info.height, bytes: info.size, format: 'webp' };
  });
}
