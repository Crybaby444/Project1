import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { day } from './support/deals';
import { resetAccounts, resetDeals } from './support/db';
import { seedListing, signedInClient } from './support/listings';
import { createTestApp, type TestApp } from './support/test-app';

describe('expensive deals ask for more (audit D4)', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp({ env: { IDENTITY_REQUIRED: 'false' } });
  });
  afterAll(() => t.close());

  it('a €300+ deposit needs a confirmed phone and identity; an ordinary deal does not', async () => {
    await resetDeals(t.prisma);
    await resetAccounts(t.prisma);
    const owner = await signedInClient(t, { name: 'Olga Owner' });
    const cheap = await seedListing(t, owner.user, { status: 'PUBLISHED', dailyCents: 1500, depositCents: 10_000 });
    const camera = await seedListing(t, owner.user, { status: 'PUBLISHED', dailyCents: 4000, depositCents: 80_000 });
    const newcomer = await signedInClient(t, { name: 'Nina New', identityVerified: false });

    await newcomer.post('/bookings').send({ listingId: cheap.id, start: day(t, 1), end: day(t, 3) }).expect(201);

    const refused = await newcomer.post('/bookings').send({ listingId: camera.id, start: day(t, 1), end: day(t, 3) });
    expect(refused.status).toBe(409);
    expect(refused.body.error).toMatchObject({ code: 'VERIFICATION_REQUIRED', details: { missing: ['PHONE', 'IDENTITY'] } });
    expect(await t.prisma.booking.count({ where: { listingId: camera.id } })).toBe(0);

    const checked = await signedInClient(t, { name: 'Vera Verified', phoneVerified: true });
    await checked.post('/bookings').send({ listingId: camera.id, start: day(t, 1), end: day(t, 3) }).expect(201);
  });

  it('€500 of rent counts too, even with a small deposit', async () => {
    const owner = await signedInClient(t, { name: 'Oskars Owner' });
    const boat = await seedListing(t, owner.user, { status: 'PUBLISHED', dailyCents: 20_000, depositCents: 0 });
    const renter = await signedInClient(t, { name: 'Pēteris Phoneless' });
    const res = await renter.post('/bookings').send({ listingId: boat.id, start: day(t, 1), end: day(t, 3) });
    expect(res.body.error).toMatchObject({ code: 'VERIFICATION_REQUIRED', details: { missing: ['PHONE'] } });
  });
});
