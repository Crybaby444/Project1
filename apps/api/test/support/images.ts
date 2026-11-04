import sharp from 'sharp';

/** A real photo-like image: noise compresses badly, like a camera picture. */
async function picture(width: number, height: number, format: 'jpeg' | 'png' | 'webp'): Promise<Buffer> {
  const pixels = Buffer.alloc(width * height * 3);
  for (let i = 0; i < pixels.length; i++) pixels[i] = (i * 2654435761) >>> 24;
  return sharp(pixels, { raw: { width, height, channels: 3 } })[format]().toBuffer();
}

/** A JPEG whose EXIF says where it was taken (Riga), as a phone writes it. */
async function jpegWithGps(): Promise<Buffer> {
  return sharp(await picture(1200, 900, 'jpeg'))
    .withExif({
      IFD0: { Make: 'TestPhone', Model: 'GPS 1' },
      IFD3: {
        GPSLatitudeRef: 'N',
        GPSLatitude: '56/1 56/1 5862/100',
        GPSLongitudeRef: 'E',
        GPSLongitude: '24/1 6/1 1868/100',
      },
    })
    .jpeg()
    .toBuffer();
}

export interface TestImages {
  jpeg: Buffer;
  png: Buffer;
  webp: Buffer;
  /** 3000×2000: the API shrinks the long side to 2048. */
  bigJpeg: Buffer;
  jpegWithGps: Buffer;
  /** An HTML page sent as if it were a JPEG. */
  htmlAsJpeg: Buffer;
  svg: Buffer;
  /** Starts like a JPEG, but is not one. */
  fakeJpeg: Buffer;
  /** 11 MB: over the 10 MB limit. */
  big11mb: Buffer;
}

export async function testImages(): Promise<TestImages> {
  return {
    jpeg: await picture(800, 600, 'jpeg'),
    png: await picture(400, 300, 'png'),
    webp: await picture(400, 300, 'webp'),
    bigJpeg: await picture(3000, 2000, 'jpeg'),
    jpegWithGps: await jpegWithGps(),
    htmlAsJpeg: Buffer.from('<!doctype html><html><body><script>alert(1)</script></body></html>'),
    svg: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><script>alert(1)</script></svg>'),
    fakeJpeg: Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(2000, 7)]),
    big11mb: Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(11 * 1024 * 1024, 1)]),
  };
}
