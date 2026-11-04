import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetAccounts } from './support/db';
import { signedInClient } from './support/listings';
import { createTestApp, type TestApp } from './support/test-app';

let t: TestApp;

beforeAll(async () => {
  t = await createTestApp();
});

afterAll(async () => {
  await t.close();
});

beforeEach(async () => {
  await resetAccounts(t.prisma);
});

const visa = { number: '4242 4242 4242 4242', expMonth: 12, expYear: 2030, cvc: '123', holder: 'Anna Bērziņa' };

describe('POST /payments/card-tokens', () => {
  it('turns card details into a token and never echoes the number', async () => {
    const anna = await signedInClient(t);
    const res = await anna.post('/payments/card-tokens').send(visa).expect(201);
    expect(res.body).toEqual({ token: expect.stringMatching(/^tok_/), brand: 'visa', last4: '4242', expMonth: 12, expYear: 2030 });
    expect(JSON.stringify(res.body)).not.toContain('4242 4242');
  });

  it('answers 400 with the field for a wrong number', async () => {
    const anna = await signedInClient(t);
    const res = await anna.post('/payments/card-tokens').send({ ...visa, number: '4242 4242 4242 4241' }).expect(400);
    expect(res.body.error).toMatchObject({ code: 'VALIDATION_FAILED', fields: { number: expect.any(String) } });
  });

  it('needs a signed-in user', async () => {
    const { default: request } = await import('supertest');
    await request(t.server).post('/api/v1/payments/card-tokens').send(visa).expect(401);
  });

  it('allows 20 cards an hour per user', async () => {
    const anna = await signedInClient(t);
    for (let i = 0; i < 20; i++) await anna.post('/payments/card-tokens').send(visa).expect(201);
    await anna.post('/payments/card-tokens').send(visa).expect(429);
  });
});
