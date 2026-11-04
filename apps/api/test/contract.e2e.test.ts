import { PDFDocument } from 'pdf-lib';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetAccounts, resetDeals } from './support/db';
import { requestBooking, step } from './support/deals';
import { resetListings, seedListing, signedInClient, type Client } from './support/listings';
import { createTestApp, type TestApp } from './support/test-app';

let t: TestApp;
let owner: Client;
let renter: Client;

beforeAll(async () => {
  t = await createTestApp();
});

afterAll(async () => {
  await t.close();
});

beforeEach(async () => {
  await resetDeals(t.prisma);
  await resetListings(t);
  await resetAccounts(t.prisma);
  owner = await signedInClient(t, { locale: 'lv' });
  renter = await signedInClient(t, { locale: 'ru' });
});

const binary = (res: { body: Buffer }) => res.body;

function pdf(client: Client, id: string, lang?: string) {
  return client
    .get(`/bookings/${id}/contract.pdf${lang ? `?lang=${lang}` : ''}`)
    .buffer(true)
    .parse((res, done) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => done(null, Buffer.concat(chunks)));
    });
}

describe('GET /bookings/:id/contract.pdf', () => {
  it('gives each side the contract, in their language unless they ask for another', async () => {
    const listing = await seedListing(t, owner.user, { status: 'PUBLISHED' });
    const booking = await requestBooking(t, renter, listing.id, 2, 4);
    await step(owner, booking.id, { type: 'ACCEPT' });

    const forRenter = await pdf(renter, booking.id);
    expect(forRenter.status).toBe(200);
    expect(forRenter.headers['content-type']).toBe('application/pdf');
    expect(forRenter.headers['content-disposition']).toBe(`attachment; filename="yoyo-contract-${booking.id}.pdf"`);
    expect((await PDFDocument.load(binary(forRenter))).getTitle()).toBe(`Договор аренды ${booking.id}`);
    expect((await PDFDocument.load(binary(await pdf(owner, booking.id)))).getTitle()).toBe(`Nomas līgums ${booking.id}`);
    expect((await PDFDocument.load(binary(await pdf(owner, booking.id, 'en')))).getTitle()).toBe(`Rental agreement ${booking.id}`);
    await pdf(owner, booking.id, 'de').expect(400);
  });

  it('keeps the terms the sides accepted, whatever happens to the listing later', async () => {
    const listing = await seedListing(t, owner.user, { status: 'PUBLISHED' });
    const booking = await requestBooking(t, renter, listing.id, 2, 4);
    await step(owner, booking.id, { type: 'ACCEPT' });
    const before = await t.prisma.contract.findUniqueOrThrow({ where: { bookingId: booking.id } });
    await t.prisma.listing.update({ where: { id: listing.id }, data: { title: 'Something else entirely' } });
    const doc = await PDFDocument.load(binary(await pdf(renter, booking.id)));
    expect(doc.getSubject()).toBe('Bosch cordless drill');
    expect((await t.prisma.contract.findUniqueOrThrow({ where: { bookingId: booking.id } })).termsHash).toBe(before.termsHash);
  });

  it('does not exist before the owner accepts, nor for anyone else', async () => {
    const listing = await seedListing(t, owner.user, { status: 'PUBLISHED' });
    const booking = await requestBooking(t, renter, listing.id, 2, 4);
    await pdf(renter, booking.id).expect(404);
    await step(owner, booking.id, { type: 'ACCEPT' });
    const stranger = await signedInClient(t);
    await pdf(stranger, booking.id).expect(404);
    const admin = await signedInClient(t, { role: 'ADMIN' });
    await pdf(admin, booking.id).expect(200);
  });
});
