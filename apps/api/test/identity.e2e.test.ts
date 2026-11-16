import 'reflect-metadata';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetAccounts, resetDeals } from './support/db';
import { testImages, type TestImages } from './support/images';
import { resetListings, seedListing, signedInClient, type Client } from './support/listings';
import { createTestApp, type TestApp } from './support/test-app';
import { day } from './support/deals';

describe('identity checked by a moderator (owner, 2026-11-16)', () => {
  let t: TestApp;
  let images: TestImages;
  let anna: Client;
  let moderator: Client;

  beforeAll(async () => {
    t = await createTestApp({ env: { IDENTITY_REQUIRED: 'true' } });
    images = await testImages();
  });

  beforeEach(async () => {
    await resetDeals(t.prisma);
    await resetListings(t);
    await resetAccounts(t.prisma);
    anna = await signedInClient(t, { name: 'Anna Bērziņa', identityVerified: false });
    moderator = await signedInClient(t, { name: 'Mod', role: 'ADMIN', staffRole: 'MODERATOR' });
  });

  afterAll(async () => {
    await t.close();
  });

  const submit = (client: Client, fields: Record<string, string> = { documentType: 'PASSPORT', consent: 'true' }) => {
    let req = client.post('/me/identity').attach('document', images.jpegWithGps, 'passport.jpg').attach('selfie', images.jpeg, 'me.jpg');
    for (const [k, v] of Object.entries(fields)) req = req.field(k, v);
    return req;
  };

  it('starts with nothing; a check needs both photos and the consent', async () => {
    expect((await anna.get('/me/identity').expect(200)).body).toMatchObject({ status: 'NONE' });
    await submit(anna, { documentType: 'PASSPORT' }).expect(400);
    await anna.post('/me/identity').attach('document', images.jpeg, 'p.jpg').field('documentType', 'PASSPORT').field('consent', 'true').expect(400);
  });

  it('a sent check waits for a moderator, encrypted; a second one waits for the first', async () => {
    const res = await submit(anna).expect(201);
    expect(res.body).toMatchObject({ status: 'PENDING', documentType: 'PASSPORT' });
    const row = await t.prisma.identityCheck.findFirstOrThrow();
    // Stored encrypted, not as an image (no JPEG/WebP header, no GPS left to read).
    expect(Buffer.from(row.documentPhoto!).subarray(0, 4).toString('hex')).not.toMatch(/^ffd8|^52494646/);
    await submit(anna).expect(409);
  });

  it('the moderator sees the queue and the photos (each look logged); others cannot', async () => {
    await submit(anna).expect(201);
    const queue = (await moderator.get('/admin/identity').expect(200)).body.items;
    expect(queue).toEqual([expect.objectContaining({ user: expect.objectContaining({ id: anna.user.id }), documentType: 'PASSPORT' })]);
    const photo = await moderator.get(`/admin/identity/${queue[0].id}/document`).expect(200);
    expect(photo.headers['content-type']).toBe('image/webp');
    expect(photo.headers['cache-control']).toMatch(/no-store/);
    await anna.get('/admin/identity').expect(403);
    expect(await t.prisma.adminAuditLog.count({ where: { action: 'IDENTITY_VIEWED', targetId: queue[0].id } })).toBe(1);
  });

  it('approved: the person is verified and the photos are erased; refused: the reason, and a new try', async () => {
    await submit(anna).expect(201);
    const id = (await t.prisma.identityCheck.findFirstOrThrow()).id;
    await moderator.post(`/admin/identity/${id}`).send({ decision: 'reject' }).expect(400);
    await moderator.post(`/admin/identity/${id}`).send({ decision: 'reject', reason: 'The photo is blurry' }).expect(200);
    expect((await anna.get('/me/identity').expect(200)).body).toMatchObject({ status: 'REJECTED', refusal: 'The photo is blurry' });
    expect(await t.prisma.identityCheck.findUniqueOrThrow({ where: { id } })).toMatchObject({ documentPhoto: null, selfiePhoto: null });

    await submit(anna).expect(201);
    const second = (await t.prisma.identityCheck.findFirstOrThrow({ where: { status: 'PENDING' } })).id;
    await moderator.post(`/admin/identity/${second}`).send({ decision: 'approve' }).expect(200);
    expect((await anna.get('/me/identity').expect(200)).body).toMatchObject({ status: 'VERIFIED' });
    expect((await anna.get('/me').expect(200)).body.user).toMatchObject({ identityVerified: true });
    expect(await t.prisma.identityCheck.findUniqueOrThrow({ where: { id: second } })).toMatchObject({ documentPhoto: null, selfiePhoto: null });
  });

  it('without a verified identity one can neither lend (submit) nor rent (request) (owner, 2026-11-16)', async () => {
    const draft = await seedListing(t, anna.user);
    const submitRes = await anna.post(`/listings/${draft.id}/submit`).expect(409);
    expect(submitRes.body.error.code).toBe('IDENTITY_REQUIRED');
    const owner = await signedInClient(t, { name: 'Owner' });
    const listing = await seedListing(t, owner.user, { status: 'PUBLISHED' });
    const booking = await anna.post('/bookings').send({ listingId: listing.id, start: day(t, 3), end: day(t, 4) }).expect(409);
    expect(booking.body.error.code).toBe('IDENTITY_REQUIRED');
  });
});
