import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { act, requestBooking, step } from './support/deals';
import { resetAccounts, resetDeals } from './support/db';
import { startFakeDokobit, type FakeDokobit } from './support/fake-dokobit';
import { seedListing, signedInClient } from './support/listings';
import { createTestApp, type TestApp } from './support/test-app';
import { splitName } from '../src/signatures/signing.service';

describe('contract signing through Dokobit (SIGNATURES=dokobit; audit C1)', () => {
  let dokobit: FakeDokobit;
  let t: TestApp;

  beforeAll(async () => {
    dokobit = await startFakeDokobit();
    t = await createTestApp({
      env: { SIGNATURES: 'dokobit', DOKOBIT_ACCESS_TOKEN: dokobit.accessToken, DOKOBIT_API_URL: dokobit.url, API_PUBLIC_URL: 'https://api.example.test' },
    });
  });

  afterAll(async () => {
    await t.close();
    await dokobit.close();
  });

  it('splits a full name into name and surname', () => {
    expect(splitName('Anna Maria Bērziņa')).toEqual({ name: 'Anna Maria', surname: 'Bērziņa' });
    expect(splitName('Prince')).toEqual({ name: 'Prince', surname: 'Prince' });
  });

  it('typed names are refused; the signature counts only after Dokobit itself says the person signed, once', async () => {
    await resetDeals(t.prisma);
    await resetAccounts(t.prisma);
    const owner = await signedInClient(t, { name: 'Olga Owner' });
    const renter = await signedInClient(t, { name: 'Rita Ann Renter' });
    const listing = await seedListing(t, owner.user, { status: 'PUBLISHED', dailyCents: 1500, depositCents: 10_000 });
    const booking = await requestBooking(t, renter, listing.id, 1, 3);
    await step(owner, booking.id, { type: 'ACCEPT' });

    const typed = await act(renter, booking.id, { type: 'SIGN' });
    expect(typed.status).toBe(409);
    expect(typed.body.error?.details).toMatchObject({ why: 'SIGN_WITH_PROVIDER' });

    // The owner cannot start the renter's turn.
    expect((await owner.post(`/bookings/${booking.id}/signing`)).status).toBe(409);

    const started = await renter.post(`/bookings/${booking.id}/signing`).expect(200);
    expect(started.body.url).toMatch(new RegExp(`^${dokobit.url}/signing/signing\\w+\\?access_token=signer-signing\\w+$`));
    const [token, signing] = [...dokobit.signings.entries()].at(-1)!;
    expect(signing).toMatchObject({ signerId: renter.user.id, name: 'Rita Ann', surname: 'Renter', signed: false });

    // A postback before the person signed (or a forged one) records nothing.
    await request(t.app.getHttpServer()).post('/api/v1/signatures/dokobit/postback').send({ action: 'signer_signed', token }).expect(200);
    await request(t.app.getHttpServer()).post('/api/v1/signatures/dokobit/postback').send({ action: 'signer_signed', token: 'forged' }).expect(200);
    expect(await t.prisma.contractSignature.count({ where: { bookingId: booking.id } })).toBe(0);
    expect((await renter.get(`/bookings/${booking.id}/signing`).expect(200)).body).toEqual({ state: 'PENDING' });

    dokobit.sign(token);
    await request(t.app.getHttpServer()).post('/api/v1/signatures/dokobit/postback').send({ action: 'signer_signed', token }).expect(200);
    // The page's own check and a repeated postback do not sign twice.
    expect((await renter.get(`/bookings/${booking.id}/signing`).expect(200)).body).toEqual({ state: 'SIGNED' });
    await request(t.app.getHttpServer()).post('/api/v1/signatures/dokobit/postback').send({ action: 'signing_completed', token }).expect(200);

    const signatures = await t.prisma.contractSignature.findMany({ where: { bookingId: booking.id } });
    expect(signatures).toHaveLength(1);
    expect(signatures[0]).toMatchObject({ side: 'RENTER', userId: renter.user.id, fullName: 'Rita Ann Renter', method: 'DOKOBIT:smartid' });
    const view = (await owner.get(`/bookings/${booking.id}`).expect(200)).body.booking;
    expect(view.signatures).toEqual([expect.objectContaining({ side: 'RENTER', method: 'DOKOBIT:smartid' })]);
    expect(view.actions).toContain('SIGN');
  });
});
