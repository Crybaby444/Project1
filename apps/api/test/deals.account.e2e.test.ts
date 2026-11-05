import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetAccounts, resetDeals } from './support/db';
import { cardToken, newKey, requestBooking, step, topUp } from './support/deals';
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
  owner = await signedInClient(t);
  renter = await signedInClient(t);
});

const deleteAccount = (client: Client) => client.delete('/me').send({ password: 'correct horse' });

describe('deleting an account with money or deals in Yoyo', () => {
  it('is refused while the account has an open deal, on either side', async () => {
    const listing = await seedListing(t, owner.user, { status: 'PUBLISHED' });
    const booking = await requestBooking(t, renter, listing.id, 2, 3);
    for (const client of [renter, owner]) {
      const res = await deleteAccount(client);
      expect(res.status).toBe(409);
      expect(res.body.error).toMatchObject({ code: 'ACTION_NOT_ALLOWED', details: { why: 'OPEN_DEALS', openDeals: 1 } });
    }
    await step(renter, booking.id, { type: 'WITHDRAW' });
    await deleteAccount(renter).expect(204);
  });

  it('is refused while the wallet holds money, which would be lost', async () => {
    await topUp(renter, 2_000);
    const res = await deleteAccount(renter);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ code: 'ACTION_NOT_ALLOWED', details: { why: 'WALLET_NOT_EMPTY', walletCents: 2_000 } });
    const token = await cardToken(renter);
    await renter.post('/wallet/payouts').set('Idempotency-Key', newKey()).send({ amountCents: 2_000, cardToken: token }).expect(201);
    await deleteAccount(renter).expect(204);
  });
});
