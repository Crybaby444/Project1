import 'reflect-metadata';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetAccounts } from './support/db';
import { cookieLine, cookieValue, createTestApp, type TestApp } from './support/test-app';
import { seedUser } from './support/users';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

describe('sessions: login, refresh, logout and the auth guard', () => {
  let t: TestApp;
  const login = (body: object) => request(t.server).post('/api/v1/auth/login').send(body);
  const me = (token?: string) => {
    const req = request(t.server).get('/api/v1/me');
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  };

  beforeAll(async () => {
    t = await createTestApp();
  });

  beforeEach(async () => {
    await resetAccounts(t.prisma);
    t.mail.sent.length = 0;
    // Every test starts outside the previous test's rate-limit windows (1 minute and 1 hour).
    t.clock.advance(HOUR + MINUTE);
  });

  afterAll(async () => {
    await t.close();
  });

  describe('POST /auth/login', () => {
    it('signs in with the right password, whatever the case and spacing of the email', async () => {
      const { email, password } = await seedUser(t, { email: 'anna@mail.lv' });

      const res = await login({ email: '  ANNA@mail.lv ', password });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ user: expect.objectContaining({ email, emailVerified: false }) });
      expect(cookieLine(res.headers['set-cookie'], 'yoyo_at')).toMatch(/Max-Age=900;.*HttpOnly/);
      expect(cookieLine(res.headers['set-cookie'], 'yoyo_rt')).toMatch(/Path=\/api\/v1\/auth;/);
      expect(JSON.stringify(res.body)).not.toContain(cookieValue(res.headers['set-cookie'], 'yoyo_at')!);
    });

    it('answers a wrong password and an unknown email with the same 401 and body', async () => {
      const { email } = await seedUser(t);

      const wrong = await login({ email, password: 'nope-nope' });
      const unknown = await login({ email: 'ghost@mail.lv', password: 'nope-nope' });

      expect([wrong.status, unknown.status]).toEqual([401, 401]);
      expect(wrong.body).toEqual(unknown.body);
      expect(wrong.body.error.code).toBe('AUTH_INVALID_CREDENTIALS');
      expect(wrong.headers['set-cookie']).toBeUndefined();
    });

    it('answers an account without a password (Google only) like a wrong password', async () => {
      const { email } = await seedUser(t, { password: null });
      const res = await login({ email, password: 'anything-at-all' });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTH_INVALID_CREDENTIALS');
    });

    it('refuses a blocked account with 403 AUTH_BLOCKED, but only to someone who knows the password', async () => {
      const { user, email, password } = await seedUser(t);
      await t.prisma.user.update({ where: { id: user.id }, data: { blockedAt: t.clock.now() } });

      expect((await login({ email, password: 'nope-nope' })).body.error.code).toBe('AUTH_INVALID_CREDENTIALS');
      const res = await login({ email, password });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('AUTH_BLOCKED');
    });

    it('answers the 6th attempt within a minute with 429 and Retry-After', async () => {
      const { email } = await seedUser(t);
      for (let i = 0; i < 5; i++) expect((await login({ email, password: 'nope-nope' })).status).toBe(401);

      const limited = await login({ email, password: 'nope-nope' });

      expect(limited.status).toBe(429);
      expect(limited.body.error.code).toBe('RATE_LIMITED');
      expect(Number(limited.headers['retry-after'])).toBeGreaterThan(0);
    });
  });

  describe('the auth guard (GET /me)', () => {
    it('accepts the access cookie and a Bearer token', async () => {
      const { email, password } = await seedUser(t);
      const agent = request.agent(t.server);
      const res = await agent.post('/api/v1/auth/login').send({ email, password }).expect(200);

      expect((await agent.get('/api/v1/me')).body.user.email).toBe(email);
      const bearer = await me(cookieValue(res.headers['set-cookie'], 'yoyo_at'));
      expect(bearer.status).toBe(200);
      expect(bearer.body.user.email).toBe(email);
    });

    it('answers 401 without a token, with a forged one, and 401 TOKEN_EXPIRED after 15 minutes', async () => {
      const { email, password } = await seedUser(t);
      const token = cookieValue((await login({ email, password })).headers['set-cookie'], 'yoyo_at')!;

      expect((await me()).body.error.code).toBe('AUTH_UNAUTHENTICATED');
      expect((await me(`${token.slice(0, -3)}abc`)).body.error.code).toBe('AUTH_UNAUTHENTICATED');
      t.clock.advance(15 * MINUTE + 1);
      const expired = await me(token);
      expect(expired.status).toBe(401);
      expect(expired.body.error.code).toBe('TOKEN_EXPIRED');
    });

    it('blocks a signed-in user at once, not when the access token runs out', async () => {
      const { user, email, password } = await seedUser(t);
      const agent = request.agent(t.server);
      await agent.post('/api/v1/auth/login').send({ email, password }).expect(200);

      await t.prisma.user.update({ where: { id: user.id }, data: { blockedAt: t.clock.now() } });

      const res = await agent.get('/api/v1/me');
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('AUTH_BLOCKED');
    });

    it('treats a deleted account’s live token as signed out', async () => {
      const { user, email, password } = await seedUser(t);
      const agent = request.agent(t.server);
      await agent.post('/api/v1/auth/login').send({ email, password }).expect(200);

      await t.prisma.user.update({ where: { id: user.id }, data: { deletedAt: t.clock.now() } });

      expect((await agent.get('/api/v1/me')).status).toBe(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('rotates the cookie session and keeps tokens out of the JSON for the site', async () => {
      const { email, password } = await seedUser(t);
      const agent = request.agent(t.server);
      const first = await agent.post('/api/v1/auth/login').send({ email, password }).expect(200);

      const res = await agent.post('/api/v1/auth/refresh');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ user: expect.objectContaining({ email }) });
      expect(cookieValue(res.headers['set-cookie'], 'yoyo_rt')).not.toBe(cookieValue(first.headers['set-cookie'], 'yoyo_rt'));
      expect((await agent.get('/api/v1/me')).status).toBe(200);
    });

    it('takes the refresh token from the body for apps and returns the new tokens in JSON', async () => {
      const { email, password } = await seedUser(t);
      const refreshToken = cookieValue((await login({ email, password })).headers['set-cookie'], 'yoyo_rt')!;

      const res = await request(t.server).post('/api/v1/auth/refresh').send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        user: expect.objectContaining({ email }),
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      });
      expect(res.body.refreshToken).not.toBe(refreshToken);
      expect((await me(res.body.accessToken)).status).toBe(200);
    });

    it('returns tokens in JSON to a client that authenticates with a Bearer header', async () => {
      const { email, password } = await seedUser(t);
      const cookies = (await login({ email, password })).headers['set-cookie'];
      const res = await request(t.server)
        .post('/api/v1/auth/refresh')
        .set('Authorization', `Bearer ${cookieValue(cookies, 'yoyo_at')}`)
        .set('Cookie', `yoyo_rt=${cookieValue(cookies, 'yoyo_rt')}`);
      expect(res.status).toBe(200);
      expect(res.body.accessToken).toEqual(expect.any(String));
    });

    it('signs out both the thief and the owner when a rotated refresh token is used again', async () => {
      const { email, password } = await seedUser(t);
      const owner = request.agent(t.server);
      const stolen = cookieValue((await owner.post('/api/v1/auth/login').send({ email, password })).headers['set-cookie'], 'yoyo_rt')!;
      await owner.post('/api/v1/auth/refresh').expect(200); // the owner's session moves on

      const thief = await request(t.server).post('/api/v1/auth/refresh').set('Cookie', `yoyo_rt=${stolen}`);
      expect(thief.status).toBe(401);
      expect(cookieLine(thief.headers['set-cookie'], 'yoyo_rt')).toMatch(/Max-Age=0/);

      const ownerAgain = await owner.post('/api/v1/auth/refresh');
      expect(ownerAgain.status).toBe(401);
      expect(ownerAgain.body.error.code).toBe('AUTH_UNAUTHENTICATED');
    });

    it('answers 401 without a refresh token', async () => {
      const res = await request(t.server).post('/api/v1/auth/refresh');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTH_UNAUTHENTICATED');
    });

    it('does not renew the session of a blocked user', async () => {
      const { user, email, password } = await seedUser(t);
      const agent = request.agent(t.server);
      await agent.post('/api/v1/auth/login').send({ email, password }).expect(200);
      await t.prisma.user.update({ where: { id: user.id }, data: { blockedAt: t.clock.now() } });

      const res = await agent.post('/api/v1/auth/refresh');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('AUTH_BLOCKED');
      expect(await t.prisma.refreshToken.count({ where: { userId: user.id, revokedAt: null } })).toBe(0);
    });
  });

  describe('logout', () => {
    it('ends the current session and clears both cookies', async () => {
      const { email, password } = await seedUser(t);
      const agent = request.agent(t.server);
      const loggedIn = await agent.post('/api/v1/auth/login').send({ email, password }).expect(200);
      const refreshToken = cookieValue(loggedIn.headers['set-cookie'], 'yoyo_rt')!;

      const res = await agent.post('/api/v1/auth/logout');

      expect(res.status).toBe(204);
      expect(cookieLine(res.headers['set-cookie'], 'yoyo_at')).toMatch(/Max-Age=0;.*Path=\//);
      expect(cookieLine(res.headers['set-cookie'], 'yoyo_rt')).toMatch(/Max-Age=0;.*Path=\/api\/v1\/auth/);
      expect((await request(t.server).post('/api/v1/auth/refresh').send({ refreshToken })).status).toBe(401);
    });

    it('logout-all ends every session of the user', async () => {
      const { email, password } = await seedUser(t);
      const phone = request.agent(t.server);
      const laptop = request.agent(t.server);
      await phone.post('/api/v1/auth/login').send({ email, password }).expect(200);
      await laptop.post('/api/v1/auth/login').send({ email, password }).expect(200);

      expect((await phone.post('/api/v1/auth/logout-all')).status).toBe(204);

      expect((await laptop.post('/api/v1/auth/refresh')).status).toBe(401);
      expect((await request(t.server).post('/api/v1/auth/logout-all')).status).toBe(401);
    });
  });

  describe('POST /auth/resend-verification', () => {
    it('needs a signed-in user', async () => {
      expect((await request(t.server).post('/api/v1/auth/resend-verification')).status).toBe(401);
    });

    it('sends a fresh link, at most once a minute', async () => {
      const { email, password } = await seedUser(t);
      const agent = request.agent(t.server);
      await agent.post('/api/v1/auth/login').send({ email, password }).expect(200);

      expect((await agent.post('/api/v1/auth/resend-verification')).status).toBe(202);
      await t.mailSent();
      expect(t.mail.to(email)).toHaveLength(1);
      expect(t.mail.to(email)[0]!.text).toMatch(/\/verify-email\?token=/);

      const again = await agent.post('/api/v1/auth/resend-verification');
      expect(again.status).toBe(429);
      t.clock.advance(MINUTE);
      expect((await agent.post('/api/v1/auth/resend-verification')).status).toBe(202);
    });

    it('sends at most 5 confirmation emails per account a day, counting the one sent at registration', async () => {
      const agent = request.agent(t.server);
      await agent
        .post('/api/v1/auth/register')
        .send({ email: 'daily@mail.lv', password: 'correct horse', name: 'Daily' })
        .expect(201);
      for (let i = 1; i <= 4; i++) {
        t.clock.advance(MINUTE);
        expect((await agent.post('/api/v1/auth/resend-verification')).status).toBe(202);
      }
      await t.mailSent();
      expect(t.mail.to('daily@mail.lv')).toHaveLength(5);

      t.clock.advance(MINUTE);
      const sixth = await agent.post('/api/v1/auth/resend-verification');
      expect(sixth.status).toBe(429);
      await t.mailSent();
      expect(t.mail.to('daily@mail.lv')).toHaveLength(5);

      t.clock.advance(24 * HOUR);
      await agent.post('/api/v1/auth/refresh').expect(200); // the access cookie ran out meanwhile
      expect((await agent.post('/api/v1/auth/resend-verification')).status).toBe(202);
      await t.mailSent();
      expect(t.mail.to('daily@mail.lv')).toHaveLength(6);
    });

    it('answers 202 and sends nothing when the email is already confirmed', async () => {
      const { email, password } = await seedUser(t, { emailVerified: true });
      const agent = request.agent(t.server);
      await agent.post('/api/v1/auth/login').send({ email, password }).expect(200);

      expect((await agent.post('/api/v1/auth/resend-verification')).status).toBe(202);
      await t.mailSent();
      expect(t.mail.to(email)).toHaveLength(0);
    });
  });
});

describe('the per-email login limit behind a proxy', () => {
  it('answers the 21st attempt within an hour with 429, even from 21 different addresses', async () => {
    const t = await createTestApp({ env: { TRUST_PROXY_HOPS: '1' } });
    try {
      await resetAccounts(t.prisma);
      const { email } = await seedUser(t);
      const attempt = (i: number) =>
        request(t.server)
          .post('/api/v1/auth/login')
          .set('X-Forwarded-For', `203.0.113.${i}`)
          .send({ email, password: 'nope-nope' });

      for (let i = 1; i <= 20; i++) {
        expect((await attempt(i)).status).toBe(401);
        t.clock.advance(MINUTE); // spread over the hour, well under the per-address limit
      }
      const twentyFirst = await attempt(21);
      expect(twentyFirst.status).toBe(429);
      expect(Number(twentyFirst.headers['retry-after'])).toBeGreaterThan(0);
    } finally {
      await t.close();
    }
  });
});

describe('the global daily mail budget (MAIL_DAILY_LIMIT)', () => {
  it('skips mail once the budget is spent, but registration and password reset still succeed', async () => {
    const t = await createTestApp({ env: { MAIL_DAILY_LIMIT: '1' } });
    try {
      await resetAccounts(t.prisma);
      const register = (email: string) =>
        request(t.server).post('/api/v1/auth/register').send({ email, password: 'correct horse', name: 'New' });
      expect((await register('first@mail.lv')).status).toBe(201);
      expect((await register('second@mail.lv')).status).toBe(201);
      expect((await request(t.server).post('/api/v1/auth/forgot-password').send({ email: 'first@mail.lv' })).status).toBe(202);
      await t.mailSent();
      expect(t.mail.sent).toHaveLength(1);
    } finally {
      await t.close();
    }
  });
});
