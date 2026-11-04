import 'reflect-metadata';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AccessTokenService } from '../src/auth/access-token.service';
import lv from '../src/mail/i18n/lv.json';
import type { MailProvider } from '../src/mail/mail.provider';
import { resetAccounts } from './support/db';
import { cookieLine, cookieValue, createTestApp, tokenFrom, type TestApp } from './support/test-app';

const HOUR = 3_600_000;
const anna = { email: '  Anna@Mail.LV ', password: 'correct horse', name: 'Anna', locale: 'lv' };

describe('registration and email verification', () => {
  let t: TestApp;
  const register = (body: object) => request(t.server).post('/api/v1/auth/register').send(body);
  const verify = (token: string) => request(t.server).post('/api/v1/auth/verify-email').send({ token });

  beforeAll(async () => {
    t = await createTestApp();
  });

  beforeEach(async () => {
    await resetAccounts(t.prisma);
    t.mail.sent.length = 0;
    // A fresh minute for every test, so the per-IP registration limit only bites where a test means it to.
    t.clock.advance(61_000);
  });

  afterAll(async () => {
    await t.close();
  });

  it('creates the account with a normalized email and signs the new user in', async () => {
    const res = await register(anna);

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: 'anna@mail.lv', name: 'Anna', locale: 'lv', emailVerified: false });
    expect(Object.keys(res.body.user).sort()).toEqual(
      ['about', 'city', 'createdAt', 'email', 'emailVerified', 'hasPassword', 'id', 'locale', 'name', 'phone', 'phoneVerified', 'role', 'theme'],
    );
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');

    const access = cookieLine(res.headers['set-cookie'], 'yoyo_at');
    const refresh = cookieLine(res.headers['set-cookie'], 'yoyo_rt');
    expect(access).toMatch(/Max-Age=900;/);
    expect(access).toMatch(/Path=\/;/);
    expect(access).toMatch(/HttpOnly/);
    expect(access).toMatch(/SameSite=Lax/);
    expect(access).not.toMatch(/Secure/);
    expect(refresh).toMatch(/Max-Age=2592000;/);
    expect(refresh).toMatch(/Path=\/api\/v1\/auth;/);
    expect(refresh).toMatch(/HttpOnly/);
    expect(refresh).toMatch(/SameSite=Lax/);

    const claims = await t.app.get(AccessTokenService).verify(cookieValue(res.headers['set-cookie'], 'yoyo_at')!);
    expect(claims).toEqual({ sub: res.body.user.id, role: 'USER', sid: expect.any(String) });
    expect(JSON.stringify(res.body)).not.toContain(cookieValue(res.headers['set-cookie'], 'yoyo_rt')!);
  });

  it('refuses an email that is already registered in another letter case, without creating a duplicate', async () => {
    await register(anna).expect(201);

    const again = await register({ ...anna, email: 'ANNA@mail.lv' });

    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('AUTH_EMAIL_TAKEN');
    expect(await t.prisma.user.count({ where: { email: 'anna@mail.lv' } })).toBe(1);
  });

  it('names the invalid fields', async () => {
    const res = await register({ email: 'nope', password: 'short', name: '', locale: 'de' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
    expect(Object.keys(res.body.error.fields).sort()).toEqual(['email', 'locale', 'name', 'password']);
    expect(await t.prisma.user.count()).toBe(0);
  });

  it('emails a link to the site in the user’s language that confirms the address once', async () => {
    await register(anna).expect(201);
    await t.mailSent();

    const [mail] = t.mail.to('anna@mail.lv');
    expect(mail!.subject).toBe(lv.verifyEmail.subject);
    expect(mail!.text).toMatch(/http:\/\/localhost:3000\/lv\/verify-email\?token=[A-Za-z0-9_-]{43}/);
    const token = tokenFrom(mail!.text);

    const first = await verify(token);
    expect(first.status).toBe(200);
    expect(first.body.user).toMatchObject({ email: 'anna@mail.lv', emailVerified: true });

    const second = await verify(token);
    expect(second.status).toBe(410);
    expect(second.body.error.code).toBe('TOKEN_USED');
  });

  it('links English users to the site without a language prefix', async () => {
    await register({ ...anna, email: 'eve@mail.lv', locale: undefined }).expect(201);
    await t.mailSent();
    expect(t.mail.to('eve@mail.lv')[0]!.text).toMatch(/http:\/\/localhost:3000\/verify-email\?token=/);
  });

  it('keeps the link valid for 24 hours and calls it expired afterwards', async () => {
    await register(anna).expect(201);
    await t.mailSent();
    const token = tokenFrom(t.mail.to('anna@mail.lv')[0]!.text);

    t.clock.advance(24 * HOUR + 1);

    const res = await verify(token);
    expect(res.status).toBe(410);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('answers a link that was never issued as invalid input', async () => {
    const res = await verify('a'.repeat(43));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatchObject({ code: 'VALIDATION_FAILED', fields: { token: expect.any(String) } });
  });

  it('allows 10 registrations a minute from one address and answers the 11th with 429', async () => {
    for (let i = 0; i < 10; i++) await register({ ...anna, email: `user${i}@mail.lv` }).expect(201);

    const eleventh = await register({ ...anna, email: 'user10@mail.lv' });

    expect(eleventh.status).toBe(429);
    expect(eleventh.body.error.code).toBe('RATE_LIMITED');
    expect(Number(eleventh.headers['retry-after'])).toBeGreaterThan(0);
  });
});

describe('registration when the mail server fails', () => {
  it('still creates the account, so the user can ask for the email again later', async () => {
    const failing: MailProvider = { send: () => Promise.reject(new Error('SMTP down')) };
    const t = await createTestApp({ mailProvider: failing });
    try {
      await resetAccounts(t.prisma);
      const res = await request(t.server).post('/api/v1/auth/register').send(anna);
      await t.mailSent();
      expect(res.status).toBe(201);
      expect(await t.prisma.user.count({ where: { email: 'anna@mail.lv' } })).toBe(1);
    } finally {
      await t.close();
    }
  });
});

describe('registration in production', () => {
  it('marks the session cookies Secure', async () => {
    const t = await createTestApp({ env: { NODE_ENV: 'production', WEB_ORIGIN: 'https://yoyo.rent' } });
    try {
      await resetAccounts(t.prisma);
      const res = await request(t.server).post('/api/v1/auth/register').send(anna);
      expect(res.status).toBe(201);
      expect(cookieLine(res.headers['set-cookie'], 'yoyo_at')).toMatch(/Secure/);
      expect(cookieLine(res.headers['set-cookie'], 'yoyo_rt')).toMatch(/Secure/);
    } finally {
      await t.close();
    }
  });
});
