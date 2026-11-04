import { addDays, localDateIn } from '@yoyo/domain';
import { randomUUID } from 'node:crypto';
import type { Client } from './listings';
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
