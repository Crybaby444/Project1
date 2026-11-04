import 'reflect-metadata';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AccessTokenService } from '../src/auth/access-token.service';
import { resetAccounts } from './support/db';
import { cookieLine, cookieValue, createTestApp, type TestApp } from './support/test-app';
import { seedUser } from './support/users';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

describe('my account', () => {
  let t: TestApp;

  /** A signed-in browser for a fresh user. */
  async function signedIn(seed: Parameters<typeof seedUser>[1] = {}) {
    const seeded = await seedUser(t, seed);
    const agent = request.agent(t.server);
    const res = await agent.post('/api/v1/auth/login').send({ email: seeded.email, password: seeded.password }).expect(200);
    return { ...seeded, agent, accessToken: cookieValue(res.headers['set-cookie'], 'yoyo_at')! };
  }

  /** The 6-digit code from the newest phone-code email to `email`. */
  async function phoneCodeFor(email: string): Promise<string> {
    await t.mailSent();
    const mail = t.mail.to(email).filter((m) => m.template === 'phone-code').at(-1);
    return /\b(\d{6})\b/.exec(mail!.text)![1]!;
  }

  beforeAll(async () => {
    t = await createTestApp();
  });

  beforeEach(async () => {
    await resetAccounts(t.prisma);
    t.mail.sent.length = 0;
    t.clock.advance(HOUR + MINUTE);
  });

  afterAll(async () => {
    await t.close();
  });

  describe('PATCH /me', () => {
    it('updates the profile, and an empty city or about clears it', async () => {
      const { agent } = await signedIn();

      const res = await agent
        .patch('/api/v1/me')
        .send({ name: '  Anna Bērziņa ', city: 'Rīga', about: 'Lending my tools.', locale: 'lv', theme: 'dark' });

      expect(res.status).toBe(200);
      expect(res.body.user).toMatchObject({ name: 'Anna Bērziņa', city: 'Rīga', about: 'Lending my tools.', locale: 'lv', theme: 'dark' });
      const cleared = await agent.patch('/api/v1/me').send({ city: '', about: null });
      expect(cleared.body.user).toMatchObject({ city: null, about: null, name: 'Anna Bērziņa' });
    });

    it('names every invalid field', async () => {
      const { agent } = await signedIn();
      const res = await agent
        .patch('/api/v1/me')
        .send({ name: '', city: 'x'.repeat(61), about: 'x'.repeat(501), locale: 'de', theme: 'blue' });
      expect(res.status).toBe(400);
      expect(Object.keys(res.body.error.fields).sort()).toEqual(['about', 'city', 'locale', 'name', 'theme']);
    });

    it('ignores fields that are not part of the profile, such as role or email', async () => {
      const { agent, email } = await signedIn();
      const res = await agent.patch('/api/v1/me').send({ role: 'ADMIN', email: 'boss@yoyo.rent', name: 'Anna' });
      expect(res.status).toBe(200);
      expect(res.body.user).toMatchObject({ role: 'USER', email });
    });

    it('needs a signed-in user', async () => {
      expect((await request(t.server).patch('/api/v1/me').send({ name: 'X' })).status).toBe(401);
    });
  });

  describe('POST /me/password', () => {
    it('refuses a wrong current password with 401', async () => {
      const { agent } = await signedIn();
      const res = await agent.post('/api/v1/me/password').send({ currentPassword: 'nope-nope', newPassword: 'new correct horse' });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTH_INVALID_CREDENTIALS');
    });

    it('changes the password, keeps this device signed in and signs out every other one', async () => {
      const { agent, email, password } = await signedIn();
      const other = request.agent(t.server);
      await other.post('/api/v1/auth/login').send({ email, password }).expect(200);

      const res = await agent.post('/api/v1/me/password').send({ currentPassword: password, newPassword: 'new correct horse' });

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(email);
      expect((await other.post('/api/v1/auth/refresh')).status).toBe(401);
      expect((await agent.post('/api/v1/auth/refresh')).status).toBe(200);
      const login = (pw: string) => request(t.server).post('/api/v1/auth/login').send({ email, password: pw });
      expect((await login(password)).status).toBe(401);
      expect((await login('new correct horse')).status).toBe(200);
    });

    it('checks the new password', async () => {
      const { agent, password } = await signedIn();
      const res = await agent.post('/api/v1/me/password').send({ currentPassword: password, newPassword: 'short' });
      expect(res.body.error.fields.newPassword).toEqual(expect.any(String));
    });
  });

  describe('DELETE /me', () => {
    it('deletes the account softly: personal data goes, sessions end, the email is free again', async () => {
      const { agent, user, email, password } = await signedIn();
      await t.prisma.oAuthAccount.create({ data: { userId: user.id, provider: 'google', providerAccountId: 'g-anna' } });

      const res = await agent.delete('/api/v1/me').send({ password });

      expect(res.status).toBe(204);
      expect(cookieLine(res.headers['set-cookie'], 'yoyo_at')).toMatch(/Max-Age=0/);
      const row = await t.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
      expect(row).toMatchObject({ email: `deleted+${user.id}@yoyo.invalid`, name: 'Deleted user', passwordHash: null, city: null, phone: null });
      expect(row.deletedAt).not.toBeNull();
      expect(await t.prisma.oAuthAccount.count({ where: { userId: user.id } })).toBe(0);
      expect((await agent.get('/api/v1/me')).status).toBe(401);
      expect((await request(t.server).post('/api/v1/auth/login').send({ email, password })).status).toBe(401);
      const again = await request(t.server).post('/api/v1/auth/register').send({ email, password, name: 'Anna again' });
      expect(again.status).toBe(201);
    });

    it('refuses a wrong or missing password for an account that has one', async () => {
      const { agent } = await signedIn();
      expect((await agent.delete('/api/v1/me').send({ password: 'nope-nope' })).status).toBe(401);
      expect((await agent.delete('/api/v1/me')).status).toBe(401);
      expect((await agent.get('/api/v1/me')).status).toBe(200);
    });

    it('deletes a Google-only account (no password to confirm with)', async () => {
      const { user } = await seedUser(t, { password: null, emailVerified: true });
      const token = await t.app.get(AccessTokenService).issue(user);
      const res = await request(t.server).delete('/api/v1/me').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(204);
    });
  });

  describe('phone confirmation', () => {
    it('emails a 6-digit code that confirms the number (SMS is simulated by email outside production)', async () => {
      const { agent, email } = await signedIn();

      expect((await agent.post('/api/v1/me/phone').send({ phone: '+371 2000-0000' })).status).toBe(202);
      const code = await phoneCodeFor(email);

      const res = await agent.post('/api/v1/me/phone/verify').send({ code });
      expect(res.status).toBe(200);
      expect(res.body.user).toMatchObject({ phone: '+37120000000', phoneVerified: true });
    });

    it('takes E.164 numbers only', async () => {
      const { agent } = await signedIn();
      const res = await agent.post('/api/v1/me/phone').send({ phone: '20000000' });
      expect(res.status).toBe(400);
      expect(res.body.error.fields.phone).toEqual(expect.any(String));
    });

    it('sends at most one code a minute, and a new code replaces the old one', async () => {
      const { agent, email } = await signedIn();
      await agent.post('/api/v1/me/phone').send({ phone: '+37120000000' }).expect(202);
      const first = await phoneCodeFor(email);

      expect((await agent.post('/api/v1/me/phone').send({ phone: '+37120000000' })).status).toBe(429);
      t.clock.advance(MINUTE);
      await agent.post('/api/v1/me/phone').send({ phone: '+37120000000' }).expect(202);
      const second = await phoneCodeFor(email);

      if (first !== second) expect((await agent.post('/api/v1/me/phone/verify').send({ code: first })).status).toBe(400);
      expect((await agent.post('/api/v1/me/phone/verify').send({ code: second })).status).toBe(200);
    });

    it('answers a wrong code with 400, and after five wrong codes the code is dead (410)', async () => {
      const { agent, email } = await signedIn();
      await agent.post('/api/v1/me/phone').send({ phone: '+37120000000' }).expect(202);
      const code = await phoneCodeFor(email);
      const wrong = code === '000000' ? '111111' : '000000';

      for (let i = 1; i <= 4; i++) {
        const res = await agent.post('/api/v1/me/phone/verify').send({ code: wrong });
        expect(res.status).toBe(400);
        expect(res.body.error.fields.code).toEqual(expect.any(String));
      }
      const fifth = await agent.post('/api/v1/me/phone/verify').send({ code: wrong });
      expect(fifth.status).toBe(410);
      expect(fifth.body.error.code).toBe('TOKEN_EXPIRED');

      const right = await agent.post('/api/v1/me/phone/verify').send({ code });
      expect(right.status).toBe(410);
      expect((await t.prisma.user.findFirstOrThrow({ where: { email } })).phoneVerifiedAt).toBeNull();
    });

    it('lets a code work for 10 minutes', async () => {
      const { agent, email } = await signedIn();
      await agent.post('/api/v1/me/phone').send({ phone: '+37120000000' }).expect(202);
      const code = await phoneCodeFor(email);

      t.clock.advance(10 * MINUTE + 1);

      const res = await agent.post('/api/v1/me/phone/verify').send({ code });
      expect(res.status).toBe(410);
      expect(res.body.error.code).toBe('TOKEN_EXPIRED');
    });

    it('reports phone confirmation as available', async () => {
      expect((await request(t.server).get('/api/v1/auth/providers')).body).toEqual({ google: false, phone: true });
    });
  });
});

describe('phone confirmation in production without an SMS provider', () => {
  it('is reported as unavailable and its routes answer 404 AUTH_PROVIDER_DISABLED', async () => {
    const t = await createTestApp({ env: { NODE_ENV: 'production' } });
    try {
      await resetAccounts(t.prisma);
      expect((await request(t.server).get('/api/v1/auth/providers')).body).toEqual({ google: false, phone: false });
      const { email, password } = await seedUser(t);
      // Production cookies are Secure, so this plain-HTTP test signs in like an app, with a Bearer token.
      const login = await request(t.server).post('/api/v1/auth/login').send({ email, password }).expect(200);
      const bearer = `Bearer ${cookieValue(login.headers['set-cookie'], 'yoyo_at')}`;

      for (const [path, body] of [
        ['/api/v1/me/phone', { phone: '+37120000000' }],
        ['/api/v1/me/phone/verify', { code: '123456' }],
      ] as const) {
        const res = await request(t.server).post(path).set('Authorization', bearer).send(body);
        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('AUTH_PROVIDER_DISABLED');
      }
      await t.mailSent();
      expect(t.mail.sent).toHaveLength(0);
    } finally {
      await t.close();
    }
  });
});
