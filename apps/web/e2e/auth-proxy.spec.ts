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
});
