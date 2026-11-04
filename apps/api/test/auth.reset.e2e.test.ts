import 'reflect-metadata';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import ru from '../src/mail/i18n/ru.json';
import { resetAccounts } from './support/db';
import { createTestApp, tokenFrom, type TestApp } from './support/test-app';
import { seedUser } from './support/users';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

describe('password reset by email', () => {
  let t: TestApp;
  const forgot = (email: string) => request(t.server).post('/api/v1/auth/forgot-password').send({ email });
  const reset = (token: string, password: string) =>
    request(t.server).post('/api/v1/auth/reset-password').send({ token, password });
  const login = (email: string, password: string) =>
    request(t.server).post('/api/v1/auth/login').send({ email, password });

  /** Requests a reset for `email` and returns the token from the email it got. */
  async function resetTokenFor(email: string): Promise<string> {
    await forgot(email).expect(202);
    await t.mailSent();
    return tokenFrom(t.mail.to(email).at(-1)!.text);
  }

  beforeAll(async () => {
    t = await createTestApp();
  });

  beforeEach(async () => {
    await resetAccounts(t.prisma);
    t.mail.sent.length = 0;
    t.clock.advance(HOUR + MINUTE); // outside the previous test's rate-limit windows
  });

  afterAll(async () => {
    await t.close();
  });

  it('answers 202 and sends nothing for an email nobody registered', async () => {
    const res = await forgot('ghost@mail.lv');
    await t.mailSent();
    expect(res.status).toBe(202);
    expect(t.mail.sent).toHaveLength(0);
  });

  it('answers 202 and emails a reset link to the site in the user’s language', async () => {
    const { email } = await seedUser(t, { locale: 'ru' });

    const res = await forgot(email.toUpperCase());
    await t.mailSent();

    expect(res.status).toBe(202);
    expect(t.mail.to(email)).toHaveLength(1);
    expect(t.mail.to(email)[0]!.subject).toBe(ru.resetPassword.subject);
    expect(t.mail.to(email)[0]!.text).toMatch(/http:\/\/localhost:3000\/ru\/reset-password\?token=[A-Za-z0-9_-]{43}/);
  });

  it('sets the new password, ends every session and confirms the email', async () => {
    const { email, password } = await seedUser(t);
    const agent = request.agent(t.server);
    await agent.post('/api/v1/auth/login').send({ email, password }).expect(200);
    const token = await resetTokenFor(email);

    const res = await reset(token, 'new correct horse');

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ email, emailVerified: true });
    expect((await login(email, password)).status).toBe(401);
    expect((await login(email, 'new correct horse')).status).toBe(200);
    expect((await agent.post('/api/v1/auth/refresh')).status).toBe(401);
  });

  it('lets a Google-only account add a password', async () => {
    const { email } = await seedUser(t, { password: null });
    await reset(await resetTokenFor(email), 'my first password').expect(200);
    expect((await login(email, 'my first password')).status).toBe(200);
  });

  it('accepts a link once', async () => {
    const { email } = await seedUser(t);
    const token = await resetTokenFor(email);
    await reset(token, 'new correct horse').expect(200);

    const again = await reset(token, 'another password');

    expect(again.status).toBe(410);
    expect(again.body.error.code).toBe('TOKEN_USED');
  });

  it('accepts a link for one hour only', async () => {
    const { email } = await seedUser(t);
    const token = await resetTokenFor(email);

    t.clock.advance(HOUR + 1);

    const res = await reset(token, 'new correct horse');
    expect(res.status).toBe(410);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('checks the new password and refuses an email confirmation link', async () => {
    const { email } = await seedUser(t);
    const token = await resetTokenFor(email);

    expect((await reset(token, 'short')).body.error.fields.password).toEqual(expect.any(String));

    await request(t.server).post('/api/v1/auth/register').send({ email: 'eve@mail.lv', password: 'correct horse', name: 'Eve' });
    await t.mailSent();
    const verifyToken = tokenFrom(t.mail.to('eve@mail.lv')[0]!.text);
    expect((await reset(verifyToken, 'new correct horse')).status).toBe(400);
  });

  it('answers the 4th request for one email within an hour with 429', async () => {
    const { email } = await seedUser(t);
    for (let i = 0; i < 3; i++) expect((await forgot(email)).status).toBe(202);

    const fourth = await forgot(email);

    expect(fourth.status).toBe(429);
    expect(Number(fourth.headers['retry-after'])).toBeGreaterThan(0);
  });
});

describe('the per-email reset limit behind a proxy', () => {
  it('answers the 6th request within an hour with 429, even from different addresses', async () => {
    const t = await createTestApp({ env: { TRUST_PROXY_HOPS: '1' } });
    try {
      await resetAccounts(t.prisma);
      const { email } = await seedUser(t);
      const attempt = (i: number) =>
        request(t.server).post('/api/v1/auth/forgot-password').set('X-Forwarded-For', `198.51.100.${i}`).send({ email });

      for (let i = 1; i <= 5; i++) expect((await attempt(i)).status).toBe(202);
      expect((await attempt(6)).status).toBe(429);
    } finally {
      await t.close();
    }
  });
});
