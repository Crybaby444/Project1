import 'reflect-metadata';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_PROVIDER } from '../src/media/storage.provider';
import { LocalStorageProvider } from '../src/media/local-storage.provider';
import { resetAccounts } from './support/db';
import { testImages, type TestImages } from './support/images';
import { resetListings, seedListing, signedInClient, type Client } from './support/listings';
import { createTestApp, type TestApp } from './support/test-app';

describe('listing photos', () => {
  let t: TestApp;
  let uploads: string;
  let images: TestImages;
  let anna: Client;
  let boris: Client;

  const upload = (client: Client, listingId: string, file: Buffer, contentType = 'image/jpeg') =>
    client.post(`/listings/${listingId}/photos`).attach('file', file, { filename: '../../evil name.jpg', contentType });

  const readLocalFile = (storageKey: string) => readFile((t.app.get(STORAGE_PROVIDER) as LocalStorageProvider).pathOf(storageKey));

  beforeAll(async () => {
    uploads = await mkdtemp(join(tmpdir(), 'yoyo-uploads-'));
    t = await createTestApp({ env: { STORAGE: 'local', UPLOADS_DIR: uploads } });
    images = await testImages();
  });

  beforeEach(async () => {
    await resetListings(t);
    await resetAccounts(t.prisma);
    t.clock.advance(60 * 60_000);
    anna = await signedInClient(t);
    boris = await signedInClient(t);
  });

  afterAll(async () => {
    await t.close();
    await rm(uploads, { recursive: true, force: true });
  });

  async function draft(client: Client = anna): Promise<string> {
    return (await client.post('/listings').send({ title: 'Drill' }).expect(201)).body.listing.id;
  }

  describe('POST /listings/:id/photos', () => {
    it('stores a photo under a random key, cleaned of EXIF and GPS, with three sizes', async () => {
      const id = await draft();

      const res = await upload(anna, id, images.jpegWithGps).expect(201);

      const { photo } = res.body;
      expect(photo).toMatchObject({ width: 1200, height: 900, position: 0 });
      expect(Object.keys(photo.urls).sort()).toEqual(['card', 'full', 'thumb']);
      expect(res.body.version).toBe(1);
      const stored = await t.prisma.listingPhoto.findUniqueOrThrow({ where: { id: photo.id } });
      expect(stored.storageKey).toMatch(/^[0-9a-f-]{36}$/);
      expect(JSON.stringify(stored)).not.toContain('evil');
      const saved = await sharp(await readLocalFile(stored.storageKey)).metadata();
      expect(saved.exif).toBeUndefined();
      expect(saved.format).toBe('webp');
    });

    it('serves the three sizes from the local storage, cacheable for good', async () => {
      const id = await draft();
      const { photo } = (await upload(anna, id, images.bigJpeg).expect(201)).body;
      expect(photo).toMatchObject({ width: 2048, height: 1365 });

      for (const [variant, size] of [
        ['thumb', [160, 120]],
        ['card', [640, 480]],
        ['full', [2048, 1365]],
      ] as const) {
        const res = await request(t.server).get(photo.urls[variant]).buffer(true).expect(200);
        expect(res.headers['content-type']).toBe('image/webp');
        expect(res.headers['cache-control']).toBe('public, max-age=31536000, immutable');
        const meta = await sharp(res.body as Buffer).metadata();
        expect([meta.width, meta.height], variant).toEqual(size);
      }
      await request(t.server).get('/api/v1/media/not-a-key/thumb').expect(404);
      await request(t.server).get(`${photo.urls.thumb.replace('/thumb', '/huge')}`).expect(404);
    });

    it('refuses HTML and SVG dressed as JPEG (415), 11 MB (413) and a ninth photo (409 PHOTO_LIMIT)', async () => {
      const id = await draft();

      expect((await upload(anna, id, images.htmlAsJpeg).expect(415)).body.error.code).toBe('UNSUPPORTED_MEDIA');
      expect((await upload(anna, id, images.svg, 'image/svg+xml').expect(415)).body.error.code).toBe('UNSUPPORTED_MEDIA');
      expect((await upload(anna, id, images.big11mb).expect(413)).body.error.code).toBe('PAYLOAD_TOO_LARGE');
      for (let i = 0; i < 8; i++) await upload(anna, id, images.jpeg).expect(201);
      const ninth = await upload(anna, id, images.jpeg).expect(409);
      expect(ninth.body.error.code).toBe('PHOTO_LIMIT');
      expect(await t.prisma.listingPhoto.count({ where: { listingId: id } })).toBe(8);
    });

    it('keeps the limit when photos arrive at the same time', async () => {
      const id = await draft();
      for (let i = 0; i < 6; i++) await upload(anna, id, images.png).expect(201);
      const results = await Promise.all([1, 2, 3, 4].map(() => upload(anna, id, images.png)));
      expect(results.map((res) => res.status).sort()).toEqual([201, 201, 409, 409]);
      expect(await t.prisma.listingPhoto.count({ where: { listingId: id } })).toBe(8);
    });

    it('needs the file in the `file` field', async () => {
      const id = await draft();
      const res = await anna.post(`/listings/${id}/photos`).send({}).expect(400);
      expect(res.body.error.fields).toHaveProperty('file');
    });

    it('sends a published listing back to review: photos are content', async () => {
      const listing = await seedListing(t, anna.user, { status: 'PUBLISHED' });
      await upload(anna, listing.id, images.jpeg).expect(201);
      expect((await t.prisma.listing.findUniqueOrThrow({ where: { id: listing.id } })).status).toBe('PENDING_REVIEW');
    });
  });

  describe('someone else’s listing (IDOR)', () => {
    it('answers 404 to uploading, deleting and reordering, and changes nothing', async () => {
      const id = await draft(anna);
      const { photo } = (await upload(anna, id, images.jpeg).expect(201)).body;

      await upload(boris, id, images.jpeg).expect(404);
      await boris.delete(`/listings/${id}/photos/${photo.id}`).expect(404);
      await boris.put(`/listings/${id}/photos/order`).send({ ids: [photo.id] }).expect(404);
      // A photo id from another listing is not found either.
      const borisListing = await draft(boris);
      await boris.delete(`/listings/${borisListing}/photos/${photo.id}`).expect(404);

      expect(await t.prisma.listingPhoto.count({ where: { listingId: id } })).toBe(1);
    });
  });

  describe('order and deletion', () => {
    it('reorders with exactly all photos; the first one is the cover', async () => {
      const id = await draft();
      const ids: string[] = [];
      for (let i = 0; i < 3; i++) ids.push((await upload(anna, id, images.jpeg).expect(201)).body.photo.id);

      expect((await anna.put(`/listings/${id}/photos/order`).send({ ids: ids.slice(0, 2) }).expect(400)).body.error.fields).toHaveProperty('ids');
      await anna.put(`/listings/${id}/photos/order`).send({ ids: [ids[0], ids[0], ids[1]] }).expect(400);
      const stale = await anna.put(`/listings/${id}/photos/order`).send({ ids: [ids[2], ids[0], ids[1]], version: 0 }).expect(409);
      expect(stale.body.error.details).toEqual({ currentVersion: 3 });
      const res = await anna.put(`/listings/${id}/photos/order`).send({ ids: [ids[2], ids[0], ids[1]], version: 3 }).expect(200);

      expect(res.body.photos.map((photo: { id: string; position: number }) => [photo.id, photo.position])).toEqual([
        [ids[2], 0],
        [ids[0], 1],
        [ids[1], 2],
      ]);
      const listing = (await anna.get(`/listings/${id}`).expect(200)).body.listing;
      expect(listing.photos[0].id).toBe(ids[2]);
      const summary = (await anna.get('/me/listings').expect(200)).body.items[0];
      expect(summary.cover).toEqual(res.body.photos[0].urls);
    });

    it('deletes a photo and its file, and closes the gap in the order', async () => {
      const id = await draft();
      const ids: string[] = [];
      for (let i = 0; i < 3; i++) ids.push((await upload(anna, id, images.jpeg).expect(201)).body.photo.id);
      const first = await t.prisma.listingPhoto.findUniqueOrThrow({ where: { id: ids[0] } });

      await anna.delete(`/listings/${id}/photos/${ids[0]}`).expect(204);

      const left = await t.prisma.listingPhoto.findMany({ where: { listingId: id }, orderBy: { position: 'asc' } });
      expect(left.map((photo) => [photo.id, photo.position])).toEqual([
        [ids[1], 0],
        [ids[2], 1],
      ]);
      await expect(readLocalFile(first.storageKey)).rejects.toThrow();
    });

    it('deletes the files of a listing that is deleted for good', async () => {
      const id = await draft();
      const { photo } = (await upload(anna, id, images.jpeg).expect(201)).body;
      const stored = await t.prisma.listingPhoto.findUniqueOrThrow({ where: { id: photo.id } });
      await anna.delete(`/listings/${id}`).expect(204);
      await expect(readLocalFile(stored.storageKey)).rejects.toThrow();
    });
  });

  describe('without photo storage', () => {
    it('answers 503 STORAGE_DISABLED, and the API still works otherwise', async () => {
      const off = await createTestApp({ env: { STORAGE: undefined, NODE_ENV: 'production', WEB_ORIGIN: 'https://yoyo.test', SMTP_URL: undefined } });
      try {
        const owner = await signedInClient(off);
        const id = (await owner.post('/listings').send({}).expect(201)).body.listing.id;
        const res = await owner.post(`/listings/${id}/photos`).attach('file', images.jpeg, 'a.jpg').expect(503);
        expect(res.body.error.code).toBe('STORAGE_DISABLED');
      } finally {
        await off.close();
      }
    });
  });
});
