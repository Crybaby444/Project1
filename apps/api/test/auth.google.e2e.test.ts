import 'reflect-metadata';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetAccounts } from './support/db';
import { googleEnv, startFakeGoogle, type FakeGoogle, type GoogleIdentity } from './support/fake-google';
import { cookieLine, createTestApp, type TestApp } from './support/test-app';
import { seedUser } from './support/users';

const MINUTE = 60_000;
const SITE = 'http://localhost:3000';

describe('sign in with Google', () => {
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
  });

  afterAll(async () => {
    await t.close();
    await google.close();
  });

  const anna: GoogleIdentity = { sub: 'google-anna', email: 'Anna@Gmail.com', email_verified: true, name: 'Anna Bērziņa' };

  /** The whole browser round trip: our /auth/google → Google's consent screen → our callback. */
  async function signIn(identity: GoogleIdentity, returnTo = '/', agent = request.agent(t.server)) {
    google.signInAs(identity);
    const start = await agent.get(`/api/v1/auth/google?returnTo=${encodeURIComponent(returnTo)}`);
    expect(start.status).toBe(302);
    const consent = await fetch(start.headers['location'] as string, { redirect: 'manual' });
    const back = new URL(consent.headers.get('location')!);
    expect(`${back.origin}${back.pathname}`).toBe(`${SITE}/api/v1/auth/google/callback`);
    const callback = await agent.get(`${back.pathname}${back.search}`);
    return { start, callback, agent, back };
  }

  it('lists Google among the sign-in methods when it is configured', async () => {
    expect((await request(t.server).get('/api/v1/auth/providers')).body).toMatchObject({ google: true });
  });

  it('sends the browser to Google with state and a PKCE S256 challenge, remembered in a short-lived cookie', async () => {
    const res = await request(t.server).get('/api/v1/auth/google?returnTo=/lv');

    expect(res.status).toBe(302);
    const target = new URL(res.headers['location'] as string);
    expect(`${target.origin}${target.pathname}`).toBe(google.authUrl);
    expect(Object.fromEntries(target.searchParams)).toMatchObject({
      client_id: google.clientId,
      redirect_uri: `${SITE}/api/v1/auth/google/callback`,
      response_type: 'code',
      code_challenge_method: 'S256',
      state: expect.stringMatching(/^[A-Za-z0-9_-]{22,}$/),
      code_challenge: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/),
    });
    expect(target.searchParams.get('scope')!.split(' ')).toEqual(expect.arrayContaining(['openid', 'email', 'profile']));
    const cookie = cookieLine(res.headers['set-cookie'], 'yoyo_oauth');
    expect(cookie).toMatch(/Max-Age=600;/);
    expect(cookie).toMatch(/Path=\/api\/v1\/auth\/google;/);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
  });

  it('creates a confirmed, password-less account for a new Google user and signs them in', async () => {
    const { callback, agent } = await signIn(anna, '/lv/items?page=2');

    expect(callback.status).toBe(302);
    expect(callback.headers['location']).toBe(`${SITE}/lv/items?page=2`);
    expect(cookieLine(callback.headers['set-cookie'], 'yoyo_at')).toMatch(/HttpOnly/);
    const user = await t.prisma.user.findUniqueOrThrow({ where: { email: 'anna@gmail.com' } });
    expect(user).toMatchObject({ name: 'Anna Bērziņa', locale: 'lv', passwordHash: null });
    expect(user.emailVerifiedAt).not.toBeNull();
    expect((await agent.get('/api/v1/me')).body.user).toMatchObject({ email: 'anna@gmail.com', hasPassword: false });
  });

  it('signs the same Google account into the same user next time', async () => {
    await signIn(anna);
    await signIn({ ...anna, email: 'anna.new@gmail.com' }); // Google identities are keyed by `sub`, not email

    expect(await t.prisma.user.count()).toBe(1);
    expect(await t.prisma.oAuthAccount.count()).toBe(1);
  });

  it('links Google to an existing account with the same confirmed email instead of creating a duplicate', async () => {
    const { user, password } = await seedUser(t, { email: 'anna@gmail.com', emailVerified: true });

    const { callback } = await signIn(anna);

    expect(callback.status).toBe(302);
    expect(await t.prisma.user.count()).toBe(1);
    expect((await t.prisma.oAuthAccount.findFirstOrThrow()).userId).toBe(user.id);
    expect((await request(t.server).post('/api/v1/auth/login').send({ email: 'anna@gmail.com', password })).status).toBe(200);
  });

  it('takes over an unconfirmed account with that email: its password and sessions no longer work', async () => {
    const { user, password } = await seedUser(t, { email: 'anna@gmail.com' }); // registered by anyone, never confirmed
    const squatter = request.agent(t.server);
    await squatter.post('/api/v1/auth/login').send({ email: 'anna@gmail.com', password }).expect(200);

    await signIn(anna);

    const linked = await t.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(linked.emailVerifiedAt).not.toBeNull();
    expect((await request(t.server).post('/api/v1/auth/login').send({ email: 'anna@gmail.com', password })).status).toBe(401);
    expect((await squatter.post('/api/v1/auth/refresh')).status).toBe(401);
  });

  /** A failed callback goes back to the sign-in page with a code the page can explain, never to a JSON body. */
  function expectLoginWithError(res: request.Response, code: string, path = '/login', next?: string) {
    expect(res.status).toBe(302);
    const target = new URL(res.headers['location'] as string);
    expect(`${target.origin}${target.pathname}`).toBe(`${SITE}${path}`);
    expect(Object.fromEntries(target.searchParams)).toEqual({ oauthError: code, ...(next && { next }) });
    expect(res.headers['content-type'] ?? '').not.toMatch(/json/);
    expect(cookieLine(res.headers['set-cookie'], 'yoyo_at')).toBeUndefined();
  }

  it('refuses a Google account whose email Google has not verified, back on the sign-in page', async () => {
    const { callback } = await signIn({ ...anna, email_verified: false });
    expectLoginWithError(callback, 'OAUTH_FAILED');
    expect(await t.prisma.user.count()).toBe(0);
  });

  it('refuses a blocked user, back on the sign-in page in their language', async () => {
    const { user } = await seedUser(t, { email: 'anna@gmail.com', emailVerified: true });
    await t.prisma.user.update({ where: { id: user.id }, data: { blockedAt: t.clock.now() } });
    const { callback } = await signIn(anna, '/lv/settings');
    expectLoginWithError(callback, 'AUTH_BLOCKED', '/lv/login', '/settings');
  });

  it('sends the browser to the sign-in page when Google sends no code', async () => {
    const agent = request.agent(t.server);
    const start = await agent.get('/api/v1/auth/google?returnTo=/ru').expect(302);
    const state = new URL(start.headers['location'] as string).searchParams.get('state');
    expectLoginWithError(await agent.get(`/api/v1/auth/google/callback?state=${state}`), 'OAUTH_FAILED', '/ru/login');
  });

  it('answers OAUTH_STATE_INVALID on the sign-in page when the state does not match or the state cookie is missing or stale', async () => {
    google.signInAs(anna);
    const agent = request.agent(t.server);
    const start = await agent.get('/api/v1/auth/google');
    const consent = await fetch(start.headers['location'] as string, { redirect: 'manual' });
    const back = new URL(consent.headers.get('location')!);

    const forged = new URLSearchParams(back.search);
    forged.set('state', 'forged-state');
    expectLoginWithError(await agent.get(`${back.pathname}?${forged}`), 'OAUTH_STATE_INVALID');
    expectLoginWithError(await request(t.server).get(`${back.pathname}${back.search}`), 'OAUTH_STATE_INVALID'); // no cookie

    const late = request.agent(t.server);
    const lateStart = await late.get('/api/v1/auth/google');
    const lateConsent = await fetch(lateStart.headers['location'] as string, { redirect: 'manual' });
    const lateBack = new URL(lateConsent.headers.get('location')!);
    t.clock.advance(10 * MINUTE + 1);
    expectLoginWithError(await late.get(`${lateBack.pathname}${lateBack.search}`), 'OAUTH_STATE_INVALID');
    expect(await t.prisma.user.count()).toBe(0);
  });

  it.each(['https://evil.example', '//evil.example/path', '/\\evil.example', 'evil'])(
    'never redirects off the site (returnTo=%s goes to /)',
    async (returnTo) => {
      const { callback } = await signIn(anna, returnTo);
      expect(callback.headers['location']).toBe(`${SITE}/`);
    },
  );

  it('brings a user who cancelled on Google back to the sign-in page, signed out, keeping where they were going', async () => {
    const agent = request.agent(t.server);
    const start = await agent.get('/api/v1/auth/google?returnTo=%2Flv%2Fitems%3Fpage%3D2').expect(302);
    const state = new URL(start.headers['location'] as string).searchParams.get('state');

    const res = await agent.get(`/api/v1/auth/google/callback?error=access_denied&state=${state}`);

    expectLoginWithError(res, 'OAUTH_CANCELLED', '/lv/login', '/items?page=2');
  });

  it('answers OAUTH_FAILED on the sign-in page when Google cannot be reached', async () => {
    const agent = request.agent(t.server);
    google.signInAs(anna);
    const start = await agent.get('/api/v1/auth/google?returnTo=/').expect(302);
    const consent = await fetch(start.headers['location'] as string, { redirect: 'manual' });
    const back = new URL(consent.headers.get('location')!);
    google.dropTokenRequests(true);

    try {
      expectLoginWithError(await agent.get(`${back.pathname}${back.search}`), 'OAUTH_FAILED');
    } finally {
      google.dropTokenRequests(false);
    }
  });
});

describe('Google sign-in without keys', () => {
  it('is reported as unavailable and its routes answer 404 AUTH_PROVIDER_DISABLED', async () => {
    const t = await createTestApp({ env: { GOOGLE_CLIENT_ID: 'only-the-id.apps.googleusercontent.com' } });
    try {
      expect((await request(t.server).get('/api/v1/auth/providers')).body).toMatchObject({ google: false });
      for (const path of ['/api/v1/auth/google', '/api/v1/auth/google/callback?code=x&state=y']) {
        const res = await request(t.server).get(path);
        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('AUTH_PROVIDER_DISABLED');
      }
    } finally {
      await t.close();
    }
  });
});
