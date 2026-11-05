import request from 'supertest';
import { AuthService } from '../../src/auth/auth.service';
import { addDays, localDateIn } from '@yoyo/domain';
import { randomUUID } from 'node:crypto';
import { seedListing, type Client } from './listings';
import type { TestApp } from './test-app';

export const CARDS = {
  visa: '4242 4242 4242 4242',
  mastercard: '5555 5555 5555 4444',
  declined: '4000 0000 0000 0002',
  noFunds: '4000 0000 0000 9995',
} as const;

/** A card token of `client` for a test number (the payment form's step before paying). */
export async function cardToken(client: Client, number: string = CARDS.visa): Promise<string> {
  const res = await client.post('/payments/card-tokens').send({ number, expMonth: 12, expYear: 2035, cvc: '123', holder: 'Test Holder' });
  if (res.status !== 201) throw new Error(`card token: ${res.status} ${JSON.stringify(res.body)}`);
  return (res.body as { token: string }).token;
}

export const newKey = () => `key-${randomUUID()}`;

/** Tops the client's wallet up by card (a fresh Idempotency-Key). */
export async function topUp(client: Client, amountCents: number): Promise<void> {
  // The token first: a supertest request must not wait on another one before it is sent.
  const token = await cardToken(client);
  const res = await client.post('/wallet/top-ups').set('Idempotency-Key', newKey()).send({ amountCents, cardToken: token });
  if (res.status !== 201) throw new Error(`top-up: ${res.status} ${JSON.stringify(res.body)}`);
}


/** The day `offset` days from the test clock's today in Riga, as `YYYY-MM-DD`. */
export function day(t: TestApp, offset: number): string {
  return addDays(localDateIn(t.clock.now(), 'Europe/Riga'), offset);
}

/** Sends a booking request and returns the booking view. */
export async function requestBooking(
  t: TestApp,
  renter: Client,
  listingId: string,
  from: number,
  to: number,
  extra: Record<string, unknown> = {},
): Promise<{ id: string; version: number; status: string; actions: string[] } & Record<string, unknown>> {
  const res = await renter.post('/bookings').send({ listingId, start: day(t, from), end: day(t, to), ...extra });
  if (res.status !== 201) throw new Error(`booking request: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.booking;
}

/**
 * A fresh session for the same user. Moving the test clock past 15 minutes ends access tokens, so
 * tests that wait for deadlines sign the sides in again.
 */
export async function again(t: TestApp, client: Client): Promise<Client> {
  const { accessToken } = await t.app.get(AuthService).startSession(client.user, {});
  const call = (method: 'get' | 'post' | 'patch' | 'put' | 'delete') => (path: string) =>
    request(t.server)[method](`/api/v1${path}`).set('Authorization', `Bearer ${accessToken}`);
  return { ...client, token: accessToken, get: call('get'), post: call('post'), patch: call('patch'), put: call('put'), delete: call('delete') };
}

export interface ActResult {
  status: number;
  body: { booking?: Record<string, unknown> & { version: number; status: string }; error?: { code: string; details?: Record<string, unknown> } };
}

/** Sends one step of a deal with the booking's current version and a fresh Idempotency-Key. */
export async function act(client: Client, bookingId: string, event: Record<string, unknown>, version?: number): Promise<ActResult> {
  const current = version ?? (await client.get(`/bookings/${bookingId}`)).body.booking?.version;
  const res = await client.post(`/bookings/${bookingId}/events`).set('Idempotency-Key', newKey()).send({ version: current ?? 0, event });
  return { status: res.status, body: res.body };
}

/** Like `act`, but fails the test unless the step succeeds; returns the booking. */
export async function step(client: Client, bookingId: string, event: Record<string, unknown>) {
  const res = await act(client, bookingId, event);
  if (res.status !== 200) throw new Error(`${String(event['type'])}: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.booking!;
}

/** A paid deal (3 days from tomorrow, by card) between `owner` and `renter` on a new listing. */
export async function paidDeal(t: TestApp, owner: Client, renter: Client, overrides: Record<string, unknown> = {}): Promise<string> {
  const listing = await seedListing(t, owner.user, { status: 'PUBLISHED', ...overrides });
  const booking = await requestBooking(t, renter, listing.id, 1, 3);
  await step(owner, booking.id, { type: 'ACCEPT' });
  await step(renter, booking.id, { type: 'SIGN' });
  await step(owner, booking.id, { type: 'SIGN' });
  const token = await cardToken(renter);
  await step(renter, booking.id, { type: 'PAY', method: 'CARD', cardToken: token });
  return booking.id;
}

/** A deal the owner got back and has not inspected yet (RETURNED). */
export async function returnedDeal(t: TestApp, owner: Client, renter: Client): Promise<string> {
  const id = await paidDeal(t, owner, renter);
  await step(owner, id, { type: 'MARK_HANDED_OVER' });
  await step(renter, id, { type: 'CONFIRM_RECEIVED' });
  await step(renter, id, { type: 'MARK_RETURNED' });
  await step(owner, id, { type: 'CONFIRM_RETURNED' });
  return id;
}
