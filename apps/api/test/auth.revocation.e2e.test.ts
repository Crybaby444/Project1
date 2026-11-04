import 'reflect-metadata';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetAccounts } from './support/db';
import { googleEnv, startFakeGoogle, type FakeGoogle } from './support/fake-google';
import { cookieValue, createTestApp, tokenFrom, type TestApp } from './support/test-app';
import { seedUser } from './support/users';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/**
 * Access tokens carry their session family (`sid`): once the family has no live refresh token, a
 * still-unexpired access token of that session is refused at once, not when its 15 minutes run out.
 */
describe('revoking a session also ends its access token at once', () => {
  let t: TestApp;
  let google: FakeGoogle;
  let now = () => new Date();

  beforeAll(async () => {
    google = await startFakeGoogle(() => now());
    t = await createTestApp({ env: googleEnv(google) });
    now = () => t.clock.now();
  });

  beforeEach(async () => {
    await resetAccounts(t.prisma);
    t.mail.sent.length = 0;
    t.clock.advance(HOUR + MINUTE);
  });

  afterAll(async () => {
    await t.close();
    await google.close();
  });

  const me = (accessToken: string) => request(t.server).get('/api/v1/me').set('Authorization', `Bearer ${accessToken}`);

  async function expectRefused(accessToken: string) {
    const res = await me(accessToken);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_UNAUTHENTICATED');
  }

  /** A signed-in device: its access token (already checked to work) and refresh token. */
  async function device(email: string, password: string) {
    const res = await request(t.server).post('/api/v1/auth/login').send({ email, password }).expect(200);
    const accessToken = cookieValue(res.headers['set-cookie'], 'yoyo_at')!;
    expect((await me(accessToken)).status).toBe(200);
    return { accessToken, refreshToken: cookieValue(res.headers['set-cookie'], 'yoyo_rt')! };
  }

  it('after refresh-token reuse detection', async () => {
    const { email, password } = await seedUser(t);
    const first = await device(email, password);
    const rotated = await request(t.server).post('/api/v1/auth/refresh').send({ refreshToken: first.refreshToken }).expect(200);
    expect((await me(rotated.body.accessToken)).status).toBe(200);

    // The old refresh token shows up again (copied): the whole family is revoked.
    await request(t.server).post('/api/v1/auth/refresh').send({ refreshToken: first.refreshToken }).expect(401);

    await expectRefused(rotated.body.accessToken);
    await expectRefused(first.accessToken);
  });

  it('after logout-all', async () => {
    const { email, password } = await seedUser(t);
    const laptop = await device(email, password);
    const phone = await device(email, password);

    await request(t.server).post('/api/v1/auth/logout-all').set('Authorization', `Bearer ${laptop.accessToken}`).expect(204);

    await expectRefused(phone.accessToken);
    await expectRefused(laptop.accessToken);
  });

  it('after logout of that session only', async () => {
    const { email, password } = await seedUser(t);
    const laptop = await device(email, password);
    const phone = await device(email, password);

    await request(t.server).post('/api/v1/auth/logout').send({ refreshToken: laptop.refreshToken }).expect(204);

    await expectRefused(laptop.accessToken);
    expect((await me(phone.accessToken)).status).toBe(200);
  });

  it('after a password reset', async () => {
    const { email, password } = await seedUser(t);
    const stolen = await device(email, password);
    await request(t.server).post('/api/v1/auth/forgot-password').send({ email }).expect(202);
    await t.mailSent();
    const token = tokenFrom(t.mail.to(email).at(-1)!.text);

    await request(t.server).post('/api/v1/auth/reset-password').send({ token, password: 'new correct horse' }).expect(200);

    await expectRefused(stolen.accessToken);
  });

  it('after a password change: other devices are out, this one continues with its new session', async () => {
    const { email, password } = await seedUser(t);
    const laptop = await device(email, password);
    const phone = await device(email, password);

    const changed = await request(t.server)
      .post('/api/v1/me/password')
      .set('Authorization', `Bearer ${laptop.accessToken}`)
      .send({ currentPassword: password, newPassword: 'new correct horse' })
      .expect(200);

    await expectRefused(phone.accessToken);
    await expectRefused(laptop.accessToken);
    expect((await me(changed.body.accessToken)).status).toBe(200);
  });

  it('after Google takes over an unconfirmed account (R7)', async () => {
    const { email, password } = await seedUser(t, { email: 'anna@gmail.com' });
    const squatter = await device(email, password);

    google.signInAs({ sub: 'google-anna', email: 'anna@gmail.com', email_verified: true, name: 'Anna' });
    const agent = request.agent(t.server);
    const start = await agent.get('/api/v1/auth/google?returnTo=%2F').expect(302);
    const consent = await fetch(start.headers['location'] as string, { redirect: 'manual' });
    const back = new URL(consent.headers.get('location')!);
    await agent.get(`${back.pathname}${back.search}`).expect(302);

    await expectRefused(squatter.accessToken);
  });

  it('refuses an access token without a session family', async () => {
    const { user } = await seedUser(t);
    const { SignJWT } = await import('jose');
    const nowSec = Math.floor(t.clock.now().getTime() / 1000);
    const legacy = await new SignJWT({ role: 'USER' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(user.id)
      .setAudience('yoyo:access')
      .setIssuedAt(nowSec)
      .setExpirationTime(nowSec + 600)
      .sign(new TextEncoder().encode(t.env.JWT_SECRET));

    await expectRefused(legacy);
  });
});
