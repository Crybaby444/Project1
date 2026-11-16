import { loadImage, renderCrop, wholePhoto } from '@/lib/listings/image-edit';

/** Small enough to send as is when the browser cannot redraw it. */
const SEND_AS_IS_BYTES = 3 * 1024 * 1024;

export class UnreadablePhotoError extends Error {}

/**
 * A phone photo redrawn as a JPEG of at most 2048 px, upright and without its metadata (as listing photos
 * are), so that the document and the selfie together stay well under the site's 11 MB request limit
 * (owner, 2026-11-16: two full-size phone photos failed to send). A photo the browser cannot open is
 * sent as it is when it is small, else refused.
 */
export async function shrinkPhoto(file: Blob): Promise<Blob> {
  let image;
  try {
    image = await loadImage(file);
  } catch {
    if (file.size <= SEND_AS_IS_BYTES) return file;
    throw new UnreadablePhotoError('The photo could not be opened');
  }
  try {
    return await renderCrop(image, wholePhoto(image.size, 0), 0);
  } finally {
    image.close();
  }
}
