/**
 * Client-side crop and rotate for listing photos (plan 6b, Task 3). The geometry is pure and works in
 * the coordinates of the photo after turning it; drawing uses the same transform for the preview and
 * the uploaded file, so what the person sees is what is sent.
 */

export type Size = { width: number; height: number };
export type Rotation = 0 | 90 | 180 | 270;
/** A rectangle of the turned photo, in its pixels. */
export type Crop = { x: number; y: number; width: number; height: number };
export type PhotoMime = 'image/jpeg' | 'image/png' | 'image/webp';

/** The card shape (640×480). */
export const CROP_ASPECT = 4 / 3;
export const MAX_ZOOM = 8;
/** The long side of what is uploaded; the API stores at most 2048 px too. */
export const MAX_OUTPUT_SIDE = 2048;
/** Originals bigger than this are not opened at all (phones produce 5–15 MB). */
export const MAX_ORIGINAL_BYTES = 30 * 1024 * 1024;

export function rotatedSize(image: Size, rotation: Rotation): Size {
  return rotation % 180 === 0
    ? { width: image.width, height: image.height }
    : { width: image.height, height: image.width };
}

/** The largest 4:3 frame in the middle of the turned photo. */
export function fitCrop(image: Size, rotation: Rotation): Crop {
  const { width, height } = rotatedSize(image, rotation);
  const frame =
    width / height > CROP_ASPECT
      ? { width: height * CROP_ASPECT, height }
      : { width, height: width / CROP_ASPECT };
  return { x: (width - frame.width) / 2, y: (height - frame.height) / 2, ...frame };
}

/** The whole turned photo (no crop). */
export function wholePhoto(image: Size, rotation: Rotation): Crop {
  return { x: 0, y: 0, ...rotatedSize(image, rotation) };
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** Moves the frame back onto the photo if it went past an edge. */
export function clampCrop(crop: Crop, image: Size, rotation: Rotation): Crop {
  const { width, height } = rotatedSize(image, rotation);
  return {
    ...crop,
    x: clamp(crop.x, 0, Math.max(0, width - crop.width)),
    y: clamp(crop.y, 0, Math.max(0, height - crop.height)),
  };
}

export function moveCrop(crop: Crop, image: Size, rotation: Rotation, dx: number, dy: number): Crop {
  return clampCrop({ ...crop, x: crop.x + dx, y: crop.y + dy }, image, rotation);
}

/** The zoom level of a frame: 1 is the largest frame, MAX_ZOOM the closest. */
export function zoomOf(crop: Crop, image: Size, rotation: Rotation): number {
  return fitCrop(image, rotation).width / crop.width;
}

/** Sets the zoom level (1…MAX_ZOOM) around the middle of the current frame. */
export function zoomCrop(crop: Crop, image: Size, rotation: Rotation, zoom: number): Crop {
  const level = clamp(zoom, 1, MAX_ZOOM);
  const fit = fitCrop(image, rotation);
  const width = fit.width / level;
  const height = fit.height / level;
  const centre = { x: crop.x + crop.width / 2, y: crop.y + crop.height / 2 };
  return clampCrop({ x: centre.x - width / 2, y: centre.y - height / 2, width, height }, image, rotation);
}

/** The size of the uploaded file: the frame, scaled down so its long side is at most `maxSide`. */
export function outputSize(crop: Crop, maxSide = MAX_OUTPUT_SIDE): Size {
  const scale = Math.min(1, maxSide / Math.max(crop.width, crop.height));
  return { width: Math.round(crop.width * scale), height: Math.round(crop.height * scale) };
}

/**
 * The canvas transform `[a, b, c, d, e, f]` that draws the original photo turned clockwise by
 * `rotation` into the turned photo's coordinates (x' = a·x + c·y + e, y' = b·x + d·y + f).
 */
export function rotationMatrix(
  rotation: Rotation,
  image: Size,
): [number, number, number, number, number, number] {
  switch (rotation) {
    case 0:
      return [1, 0, 0, 1, 0, 0];
    case 90:
      return [0, 1, -1, 0, image.height, 0];
    case 180:
      return [-1, 0, 0, -1, image.width, image.height];
    case 270:
      return [0, -1, 1, 0, 0, image.width];
  }
}

export type LoadedImage = { source: CanvasImageSource; size: Size; close(): void };

/** Opens a photo file, turned upright by its EXIF orientation. Throws when the browser cannot read it. */
export async function loadImage(file: Blob): Promise<LoadedImage> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    return {
      source: bitmap,
      size: { width: bitmap.width, height: bitmap.height },
      close: () => bitmap.close(),
    };
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return {
      source: image,
      size: { width: image.naturalWidth, height: image.naturalHeight },
      close: () => {},
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Draws `crop` of the turned photo onto `canvas`, filling it. */
export function drawCrop(
  canvas: HTMLCanvasElement,
  image: LoadedImage,
  crop: Crop,
  rotation: Rotation,
): void {
  const context = canvas.getContext('2d');
  if (!context) return;
  const scale = canvas.width / crop.width;
  context.save();
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.scale(scale, scale);
  context.translate(-crop.x, -crop.y);
  context.transform(...rotationMatrix(rotation, image.size));
  context.imageSmoothingQuality = 'high';
  context.drawImage(image.source, 0, 0);
  context.restore();
}

/** The cropped, turned photo as a JPEG of at most MAX_OUTPUT_SIDE px (the original's metadata is gone). */
export async function renderCrop(image: LoadedImage, crop: Crop, rotation: Rotation): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const size = outputSize(crop);
  canvas.width = size.width;
  canvas.height = size.height;
  drawCrop(canvas, image, crop, rotation);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('The photo could not be encoded'))),
      'image/jpeg',
      0.9,
    ),
  );
}

/** JPEG, PNG or WebP by the first bytes of the file (as the API checks), whatever its name or type says. */
export async function sniffImage(file: Blob): Promise<PhotoMime | null> {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const at = (offset: number, ...expected: number[]) =>
    expected.every((byte, index) => bytes[offset + index] === byte);
  if (at(0, 0xff, 0xd8, 0xff)) return 'image/jpeg';
  if (at(0, 0x89, 0x50, 0x4e, 0x47)) return 'image/png';
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return 'image/webp';
  return null;
}
