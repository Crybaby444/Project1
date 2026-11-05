import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { CLOCK } from '../src/clock/clock';
import { FakeCardProvider } from '../src/payments/fake-card.provider';
import { PAYMENT_PROVIDER } from '../src/payments/payment.provider';
import { TimersService } from '../src/timers/timers.service';
import { resetAccounts, resetDeals } from './support/db';
import { cardToken, newKey, requestBooking, step } from './support/deals';
import { FakeClock } from './support/fake-clock';
import { resetListings, seedListing, signedInClient, type Client } from './support/listings';
import { createTestApp, type TestApp } from './support/test-app';

/** The test card provider, but its next refunds fail as if the provider were down. */
class FlakyRefunds extends FakeCardProvider {
  failures = 0;

  override async refund(input: { paymentRef: string; amountCents: number; idempotencyKey: string }) {
    if (this.failures > 0) {
      this.failures--;
      throw new Error('provider unavailable');
    }
    return super.refund(input);
  }
}

let t: TestApp;
let cards: FlakyRefunds;
let owner: Client;
let renter: Client;

beforeAll(async () => {
  // The provider reads the same fake clock the app uses, so card tokens stay fresh in the test.
  const clock = new FakeClock();
  cards = new FlakyRefunds('test-only-jwt-secret-0123456789abcdef', clock);
  t = await createTestApp({ providers: [{ provide: PAYMENT_PROVIDER, useValue: cards }, { provide: CLOCK, useValue: clock }] });
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

describe('giving back a charge the deal did not take', () => {
  it('keeps the refund as a job when the provider fails, answers with the real error, and the job finishes it', async () => {
    const listing = await seedListing(t, owner.user, { status: 'PUBLISHED' });
    const booking = await requestBooking(t, renter, listing.id, 1, 3);
    await step(owner, booking.id, { type: 'ACCEPT' });
    await step(renter, booking.id, { type: 'SIGN' });
    await step(owner, booking.id, { type: 'SIGN' });
    const [t1, t2] = [await cardToken(renter), await cardToken(renter)];
    cards.failures = 1;
    const pay = (token: string) =>
      renter.post(`/bookings/${booking.id}/events`).set('Idempotency-Key', newKey()).send({ version: 3, event: { type: 'PAY', method: 'CARD', cardToken: token } });
    const results = await Promise.all([pay(t1), pay(t2)]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(results.find((r) => r.status === 409)!.body.error.code).toBe('INVALID_STATUS');

    const orphan = await t.prisma.payment.findFirstOrThrow({ where: { refundedCents: { gt: 0 } }, include: { refunds: true } });
    expect(orphan).toMatchObject({ amountCents: 9_950, refundedCents: 9_950 });
    expect(orphan.refunds).toMatchObject([{ amountCents: 9_950, status: 'PENDING', attempts: 1, lastError: 'provider unavailable' }]);

    await t.app.get(TimersService).runDue();
    expect(await t.prisma.paymentRefund.findFirstOrThrow({ where: { paymentId: orphan.id } })).toMatchObject({ status: 'DONE', attempts: 2 });
  });
});
