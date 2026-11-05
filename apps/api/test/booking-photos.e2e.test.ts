import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetAccounts, resetDeals } from './support/db';
import { act, CARDS, cardToken, requestBooking, step } from './support/deals';
import { testImages, type TestImages } from './support/images';
import { resetListings, seedListing, signedInClient, type Client } from './support/listings';
import { createTestApp, type TestApp } from './support/test-app';

let t: TestApp;
let uploads: string;
let images: TestImages;
let owner: Client;
let renter: Client;

beforeAll(async () => {
  uploads = await mkdtemp(join(tmpdir(), 'yoyo-deal-photos-'));
  t = await createTestApp({ env: { STORAGE: 'local', UPLOADS_DIR: uploads } });
  images = await testImages();
});

afterAll(async () => {
  await t.close();
  await rm(uploads, { recursive: true, force: true });
});

beforeEach(async () => {
  await resetDeals(t.prisma);
  await resetListings(t);
  await resetAccounts(t.prisma);
  owner = await signedInClient(t);
  renter = await signedInClient(t);
});

const upload = (client: Client, id: string, kind: string, file: Buffer = images.jpeg) =>
  client.post(`/bookings/${id}/photos?kind=${kind}`).attach('file', file, { filename: 'p.jpg', contentType: 'image/jpeg' });

async function paidDeal(): Promise<string> {
  const listing = await seedListing(t, owner.user, { status: 'PUBLISHED' });
  const booking = await requestBooking(t, renter, listing.id, 1, 3);
  await step(owner, booking.id, { type: 'ACCEPT' });
  await step(renter, booking.id, { type: 'SIGN' });
  await step(owner, booking.id, { type: 'SIGN' });
  const token = await cardToken(renter, CARDS.visa);
  await step(renter, booking.id, { type: 'PAY', method: 'CARD', cardToken: token });
  return booking.id;
}

async function returnedDeal(): Promise<string> {
  const id = await paidDeal();
  await step(owner, id, { type: 'MARK_HANDED_OVER' });
  await step(renter, id, { type: 'CONFIRM_RECEIVED' });
  await step(renter, id, { type: 'MARK_RETURNED' });
  await step(owner, id, { type: 'CONFIRM_RETURNED' });
  return id;
}

describe('deal photos', () => {
  it('stores handover photos of the owner and shows them to both sides', async () => {
    const id = await paidDeal();
    const res = await upload(owner, id, 'HANDOVER');
    expect(res.status).toBe(201);
    expect(res.body.photo).toMatchObject({ kind: 'HANDOVER', uploaderId: owner.user.id, urls: { thumb: expect.any(String) } });
    expect((await renter.get(`/bookings/${id}/photos`).expect(200)).body.items).toHaveLength(1);
  });

  it('keeps each kind to its side and step', async () => {
    const id = await paidDeal();
    expect((await upload(renter, id, 'HANDOVER')).body.error.code).toBe('ACTION_NOT_ALLOWED');
    expect((await upload(owner, id, 'DAMAGE')).body.error.code).toBe('ACTION_NOT_ALLOWED');
    expect((await upload(renter, id, 'RETURN')).body.error.code).toBe('ACTION_NOT_ALLOWED');
  });

  it('is invisible to anyone else', async () => {
    const id = await paidDeal();
    const stranger = await signedInClient(t);
    await upload(stranger, id, 'HANDOVER').expect(404);
    await stranger.get(`/bookings/${id}/photos`).expect(404);
  });

  it('checks files like listing photos', async () => {
    const id = await paidDeal();
    expect((await upload(owner, id, 'HANDOVER', images.htmlAsJpeg)).status).toBe(415);
  });

  it('allows 8 photos of a kind', async () => {
    const id = await paidDeal();
    for (let i = 0; i < 8; i++) await upload(owner, id, 'HANDOVER').expect(201);
    expect((await upload(owner, id, 'HANDOVER')).body.error.code).toBe('PHOTO_LIMIT');
  });

  it('a damage claim names damage photos of this deal only', async () => {
    const id = await returnedDeal();
    const other = await returnedDeal();
    const foreign = (await upload(owner, other, 'DAMAGE').expect(201)).body.photo.id;
    const handover = await t.prisma.bookingPhoto.create({
      data: { bookingId: id, uploaderId: owner.user.id, kind: 'RETURN', storageKey: crypto.randomUUID(), width: 1, height: 1, bytes: 1, format: 'webp' },
    });
    const bad = await act(owner, id, { type: 'REPORT_DAMAGE', description: 'The chuck is cracked.', photoIds: [foreign] });
    expect(bad.status).toBe(400);
    expect(bad.body.error).toMatchObject({ code: 'VALIDATION_FAILED' });
    expect((await act(owner, id, { type: 'REPORT_DAMAGE', description: 'The chuck is cracked.', photoIds: [handover.id] })).status).toBe(400);
    const own = (await upload(owner, id, 'DAMAGE').expect(201)).body.photo.id;
    const claimed = await step(owner, id, { type: 'REPORT_DAMAGE', description: 'The chuck is cracked.', photoIds: [own] });
    expect(claimed).toMatchObject({ status: 'DAMAGE_CLAIMED', damage: { photoIds: [own] } });
  });
});
