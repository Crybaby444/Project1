import 'reflect-metadata';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetAccounts } from './support/db';
import { appleCookieOptions } from '../src/auth/apple-oauth.service';
import { appleEnv, startFakeApple, type AppleIdentity, type FakeApple } from './support/fake-apple';
import { cookieLine, createTestApp, type TestApp } from './support/test-app';
import { seedUser } from './support/users';

const SITE = 'http://localhost:3000';

describe('sign in with Apple (owner, 2026-11-16)', () => {
  let t: TestApp;
  let apple: FakeApple;
  let now = () => new Date();

  beforeAll(async () => {
    apple = await startFakeApple(() => now());
    t = await createTestApp({ env: appleEnv(apple) });
    now = () => t.clock.now();
  });

  beforeEach(async () => {
    await resetAccounts(t.prisma);
  });

  afterAll(async () => {
    await t.close();
    await apple.close();
  });

  const anna: AppleIdentity = { sub: 'apple-anna', email: 'Anna@iCloud.com', firstName: 'Anna', lastName: 'Bērziņa' };

  /** Our /auth/apple → Apple's consent screen → Apple posts the form back to our callback. */
  async function signIn(identity: AppleIdentity, returnTo = '/', agent = request.agent(t.server)) {
    apple.signInAs(identity);
    const start = await agent.get(`/api/v1/auth/apple?returnTo=${encodeURIComponent(returnTo)}`);
    expect(start.status).toBe(302);
    const { redirectUri, form } = await apple.consent(start.headers['location'] as string);
    expect(redirectUri).toBe(`${SITE}/api/v1/auth/apple/callback`);
    const callback = await agent.post('/api/v1/auth/apple/callback').type('form').send(form);
    return { start, callback, agent };
  }

  it('lists Apple among the sign-in methods when it is configured', async () => {
    expect((await request(t.server).get('/api/v1/auth/providers')).body).toMatchObject({ apple: true });
  });

  it('asks Apple for the name and email by form_post, remembering the attempt in a cookie Apple’s POST brings back', async () => {
    const res = await request(t.server).get('/api/v1/auth/apple?returnTo=/lv');
    const target = new URL(res.headers['location'] as string);
    expect(Object.fromEntries(target.searchParams)).toMatchObject({ client_id: apple.clientId, response_type: 'code', response_mode: 'form_post', scope: 'name email' });
    const cookie = cookieLine(res.headers['set-cookie'], 'yoyo_oauth_apple');
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/Path=\/api\/v1\/auth\/apple;/);
  });

  it('in production the attempt cookie is SameSite=None and Secure (Apple comes back by a cross-site POST); over http it is Lax', () => {
    expect(appleCookieOptions(true, 600)).toMatchObject({ sameSite: 'none', secure: true, httpOnly: true });
    expect(appleCookieOptions(false, 600)).toMatchObject({ sameSite: 'lax', secure: false });
  });

  it('creates a confirmed, password-less account with the name Apple gives once, and signs in', async () => {
    const { callback, agent } = await signIn(anna, '/lv/items');
    expect(callback.status).toBe(302);
    expect(callback.headers['location']).toBe(`${SITE}/lv/items`);
    expect(cookieLine(callback.headers['set-cookie'], 'yoyo_at')).toMatch(/HttpOnly/);
    const user = await t.prisma.user.findUniqueOrThrow({ where: { email: 'anna@icloud.com' } });
    expect(user).toMatchObject({ name: 'Anna Bērziņa', locale: 'lv', passwordHash: null });
    expect(user.emailVerifiedAt).not.toBeNull();
    expect((await agent.get('/api/v1/me')).body.user).toMatchObject({ email: 'anna@icloud.com', hasPassword: false });

    // The next time Apple sends no name: the same account, the name kept.
    const again = await signIn({ sub: 'apple-anna', email: 'Anna@iCloud.com' });
    expect(again.callback.status).toBe(302);
    expect(await t.prisma.user.count()).toBe(1);
    expect((await t.prisma.user.findFirstOrThrow()).name).toBe('Anna Bērziņa');
  });

  it('a hidden (relay) address is an account of its own; an existing confirmed email gets Apple linked', async () => {
    const relay = await signIn({ sub: 'apple-relay', email: 'x7k2@privaterelay.appleid.com', is_private_email: true });
    expect(relay.callback.status).toBe(302);
    const { user: olga } = await seedUser(t, { email: 'olga@mail.lv', emailVerified: true });
    await signIn({ sub: 'apple-olga', email: 'olga@mail.lv' });
    expect(await t.prisma.oAuthAccount.findFirst({ where: { provider: 'apple', providerAccountId: 'apple-olga' } })).toMatchObject({ userId: olga.id });
  });

  it('a forged state or a cancelled consent goes back to sign-in, signed out', async () => {
    const agent = request.agent(t.server);
    apple.signInAs(anna);
    const start = await agent.get('/api/v1/auth/apple');
    const { form } = await apple.consent(start.headers['location'] as string);
    const forged = await agent.post('/api/v1/auth/apple/callback').type('form').send({ ...form, state: 'not-the-state' });
    expect(forged.headers['location']).toMatch(/\/login\?oauthError=OAUTH_STATE_INVALID/);

    const start2 = await agent.get('/api/v1/auth/apple?returnTo=/ru');
    const state = new URL(start2.headers['location'] as string).searchParams.get('state')!;
    const cancelled = await agent.post('/api/v1/auth/apple/callback').type('form').send({ state, error: 'user_cancelled_authorize' });
    expect(cancelled.headers['location']).toBe(`${SITE}/ru/login?oauthError=OAUTH_CANCELLED`);
    expect(await t.prisma.user.count()).toBe(0);
  });
});
