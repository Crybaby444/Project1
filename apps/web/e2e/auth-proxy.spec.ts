import { expect, test } from '@playwright/test';
import en from '../messages/en.json' with { type: 'json' };

// The site and the API meet on one origin: the site proxies /api/* to the API, so the session
// cookies the API sets are first-party cookies of the site (also on vercel.app / onrender.com).
test.describe('accounts through the site’s /api proxy', () => {
  test('a session made through the site works on the site', async ({ page, context }) => {
    const email = `e2e-${Date.now()}-${Math.round(Math.random() * 1e6)}@mail.lv`;

    const reg = await page.request.post('/api/v1/auth/register', {
      data: { email, password: 'correct horse', name: 'E2E', locale: 'en' },
    });
    expect(reg.status()).toBe(201);

    const cookies = await context.cookies(); // all paths: yoyo_rt only travels to /api/v1/auth
    const access = cookies.find((cookie) => cookie.name === 'yoyo_at');
    expect(access).toMatchObject({ domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' });
    expect(cookies.find((cookie) => cookie.name === 'yoyo_rt')).toMatchObject({ path: '/api/v1/auth', httpOnly: true });

    const me = await page.request.get('/api/v1/me');
    expect(me.status()).toBe(200);
    expect((await me.json()).user.name).toBe('E2E');

    // A real page: its own fetches carry the HttpOnly cookie, and the API accepts the site's Origin.
    await page.goto('/styleguide');
    await expect(page.getByText(en.apiStatus.online)).toBeVisible(); // health also goes through the site's origin
    const fromPage = await page.evaluate(async () => {
      const meRes = await fetch('/api/v1/me');
      const refreshRes = await fetch('/api/v1/auth/refresh', { method: 'POST' });
      return { me: meRes.status, refresh: refreshRes.status, cache: meRes.headers.get('cache-control') };
    });
    expect(fromPage).toEqual({ me: 200, refresh: 200, cache: 'no-store' });

    const logout = await page.evaluate(async () => (await fetch('/api/v1/auth/logout', { method: 'POST' })).status);
    expect(logout).toBe(204);
    expect((await page.request.get('/api/v1/me')).status()).toBe(401);
  });

  test('the site proxy adds the proxy secret, so the API trusts the forwarded client address', async ({ request }) => {
    // With the secret the API reads the visitor from X-Forwarded-For (2 hops); without it, it would use
    // the next hop, which is the same for both "visitors" here. The per-address login limit
    // (30 a minute across all emails) shows which address the API used.
    const run = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const octet = () => 1 + Math.floor(Math.random() * 250);
    const visitor = (n: number) => `198.51.${n}.${octet()}`;
    const [first, second] = [visitor(100), visitor(101)];
    const attempt = (from: string, i: number) =>
      request.post('/api/v1/auth/login', {
        headers: { 'X-Forwarded-For': `${from}, 192.0.2.1` },
        data: { email: `spray-${run}-${i}@mail.lv`, password: 'nope-nope' },
      });

    for (let i = 1; i <= 30; i++) expect((await attempt(first, i)).status()).toBe(401);
    expect((await attempt(first, 31)).status()).toBe(429);
    expect((await attempt(second, 32)).status()).toBe(401);
  });
});
