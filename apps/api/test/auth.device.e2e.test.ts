import 'reflect-metadata';
import { SignJWT } from 'jose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AccessTokenService } from '../src/auth/access-token.service';
import { RefreshTokenService } from '../src/auth/refresh-token.service';
import { resetAccounts } from './support/db';
import { cookieLine, cookieValue, createTestApp, type TestApp } from './support/test-app';
import { seedUser } from './support/users';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/**
 * Device cookies (OWASP): a browser that signed in to an account before carries a signed `yoyo_dev`
 * cookie. Its logins count against a per-device bucket, so an attacker who fills the per-email
 * bucket with wrong passwords cannot lock the owner out.
 */
describe('device cookies keep the owner able to sign in', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp({ env: { TRUST_PROXY_HOPS: '1' } });
  });

  beforeEach(async () => {
    await resetAccounts(t.prisma);
    t.clock.advance(HOUR + MINUTE);
  });

  afterAll(async () => {
    await t.close();
  });

  const login = (body: object, from: string, deviceCookie?: string) => {
    const req = request(t.server).post('/api/v1/auth/login').set('X-Forwarded-For', from);
    return deviceCookie ? req.set('Cookie', `yoyo_dev=${deviceCookie}`).send(body) : req.send(body);
  };

  /** An attacker spends the whole per-email bucket (20 an hour) from many addresses. */
  async function fillEmailBucket(email: string) {
    let status = 0;
    for (let i = 1; i <= 21 && status !== 429; i++) {
      status = (await login({ email, password: 'nope-nope' }, `198.51.100.${i}`)).status;
      t.clock.advance(MINUTE);
    }
    expect(status).toBe(429);
    expect((await login({ email, password: 'nope-nope' }, '198.51.100.99')).status).toBe(429);
  }

  it('sets a year-long HttpOnly device cookie on /api/v1/auth after a login and after a registration', async () => {
    const { email, password } = await seedUser(t);
    const res = await login({ email, password }, '203.0.113.1');
    const line = cookieLine(res.headers['set-cookie'], 'yoyo_dev');
    expect(line).toMatch(/Max-Age=31536000;/);
    expect(line).toMatch(/Path=\/api\/v1\/auth;/);
    expect(line).toMatch(/HttpOnly/);
    expect(line).toMatch(/SameSite=Lax/);
    expect(line).not.toMatch(/Secure/);

    const registered = await request(t.server)
      .post('/api/v1/auth/register')
      .send({ email: 'new@mail.lv', password: 'correct horse', name: 'New' });
    expect(registered.status).toBe(201);
    expect(cookieValue(registered.headers['set-cookie'], 'yoyo_dev')).toBeTruthy();
  });

  it('lets the owner with a device cookie sign in after an attacker filled the per-email bucket', async () => {
    const { email, password } = await seedUser(t);
    const first = await login({ email, password }, '203.0.113.1');
    const device = cookieValue(first.headers['set-cookie'], 'yoyo_dev')!;

    await fillEmailBucket(email);

    const owner = await login({ email, password }, '203.0.113.1', device);
    expect(owner.status).toBe(200);
    expect((await login({ email, password }, '203.0.113.7')).status).toBe(429); // no cookie: still locked
  });

  it('limits a device to 5 attempts a minute', async () => {
    const { email, password } = await seedUser(t);
    const device = cookieValue((await login({ email, password }, '203.0.113.1')).headers['set-cookie'], 'yoyo_dev')!;
    for (let i = 1; i <= 5; i++) {
      expect((await login({ email, password: 'nope-nope' }, `203.0.113.${10 + i}`, device)).status).toBe(401);
    }
    const sixth = await login({ email, password }, '203.0.113.20', device);
    expect(sixth.status).toBe(429);
    t.clock.advance(MINUTE);
    expect((await login({ email, password }, '203.0.113.21', device)).status).toBe(200);
  });

  it('does not help with a device cookie of another account', async () => {
    const anna = await seedUser(t, { email: 'anna@mail.lv' });
    const mallory = await seedUser(t, { email: 'mallory@mail.lv' });
    const malloryDevice = cookieValue(
      (await login({ email: mallory.email, password: mallory.password }, '203.0.113.1')).headers['set-cookie'],
      'yoyo_dev',
    )!;

    await fillEmailBucket(anna.email);

    expect((await login({ email: anna.email, password: anna.password }, '203.0.113.1', malloryDevice)).status).toBe(429);
  });

  it('does not help with a forged device cookie', async () => {
    const { user, email, password } = await seedUser(t);
    await fillEmailBucket(email);

    const now = Math.floor(t.clock.now().getTime() / 1000);
    const forged = await new SignJWT({ did: 'forged-device' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(user.id)
      .setAudience('yoyo:device')
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .sign(new TextEncoder().encode('not-the-real-secret-but-long-enough-0123'));
    // An access token is signed with the right key but is not a device cookie.
    const session = await t.app.get(RefreshTokenService).issue(user.id, {});
    const accessToken = await t.app.get(AccessTokenService).issue(user, session.familyId);

    expect((await login({ email, password }, '203.0.113.1', forged)).status).toBe(429);
    expect((await login({ email, password }, '203.0.113.1', accessToken)).status).toBe(429);
    expect((await login({ email, password }, '203.0.113.1', 'garbage')).status).toBe(429);
  });
});
