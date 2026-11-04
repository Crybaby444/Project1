import 'reflect-metadata';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PROXY_SECRET_HEADER } from '../src/common/request-meta';
import { resetAccounts } from './support/db';
import { createTestApp, type TestApp } from './support/test-app';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const PROXY_SECRET = 'e2e-proxy-secret-that-is-long-enough-0123';

describe('client addresses behind the site proxy and Render (PROXY_SECRET, 2 hops)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp({ env: { TRUST_PROXY_HOPS: '2', PROXY_SECRET } });
  });

  beforeEach(async () => {
    await resetAccounts(t.prisma);
    t.clock.advance(HOUR + MINUTE);
  });

  afterAll(async () => {
    await t.close();
  });

  /** A login as Render passes it on: the claimed client first, then the address Render saw. */
  const login = (email: string, claimed: string, seen: string, secret?: string) => {
    const req = request(t.server).post('/api/v1/auth/login').set('X-Forwarded-For', `${claimed}, ${seen}`);
    return (secret ? req.set(PROXY_SECRET_HEADER, secret) : req).send({ email, password: 'nope-nope' });
  };

  it('ignores a spoofed X-Forwarded-For on direct calls: the per-address limit still applies', async () => {
    for (let i = 1; i <= 5; i++) expect((await login('anna@mail.lv', `198.51.100.${i}`, '192.0.2.50')).status).toBe(401);
    expect((await login('anna@mail.lv', '198.51.100.6', '192.0.2.50')).status).toBe(429);
    // A wrong secret is no better than none.
    expect((await login('anna@mail.lv', '198.51.100.7', '192.0.2.50', 'not-the-secret')).status).toBe(429);
  });

  it('trusts the forwarded client address from the site proxy (right secret)', async () => {
    for (let i = 1; i <= 5; i++) {
      expect((await login('anna@mail.lv', '198.51.100.1', '76.76.21.21', PROXY_SECRET)).status).toBe(401);
    }
    expect((await login('anna@mail.lv', '198.51.100.1', '76.76.21.21', PROXY_SECRET)).status).toBe(429);
    // Another visitor behind the same Vercel address is somebody else.
    expect((await login('anna@mail.lv', '198.51.100.2', '76.76.21.21', PROXY_SECRET)).status).toBe(401);
  });

  it('limits logins per address across all emails: the 31st within a minute is 429', async () => {
    for (let i = 1; i <= 30; i++) {
      expect((await login(`spray${i}@mail.lv`, '203.0.113.9', '76.76.21.21', PROXY_SECRET)).status).toBe(401);
    }
    const limited = await login('spray31@mail.lv', '203.0.113.9', '76.76.21.21', PROXY_SECRET);
    expect(limited.status).toBe(429);
    expect(Number(limited.headers['retry-after'])).toBeGreaterThan(0);
    expect((await login('spray31@mail.lv', '203.0.113.10', '76.76.21.21', PROXY_SECRET)).status).toBe(401);
    t.clock.advance(MINUTE);
    expect((await login('spray32@mail.lv', '203.0.113.9', '76.76.21.21', PROXY_SECRET)).status).toBe(401);
  });
});

describe('the global registration cap (REGISTRATION_HOURLY_CAP)', () => {
  it('answers registrations over the hourly cap with 429, from any address, until the hour has passed', async () => {
    const t = await createTestApp({ env: { TRUST_PROXY_HOPS: '1', REGISTRATION_HOURLY_CAP: '3' } });
    try {
      await resetAccounts(t.prisma);
      t.clock.advance(HOUR + MINUTE);
      const register = (i: number) =>
        request(t.server)
          .post('/api/v1/auth/register')
          .set('X-Forwarded-For', `203.0.113.${i}`)
          .send({ email: `new${i}@mail.lv`, password: 'correct horse', name: 'New' });

      for (let i = 1; i <= 3; i++) expect((await register(i)).status).toBe(201);
      const capped = await register(4);
      expect(capped.status).toBe(429);
      expect(capped.body.error.code).toBe('RATE_LIMITED');
      t.clock.advance(HOUR);
      expect((await register(5)).status).toBe(201);
    } finally {
      await t.close();
    }
  });
});
