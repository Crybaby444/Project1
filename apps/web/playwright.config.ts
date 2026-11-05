import { defineConfig, devices } from '@playwright/test';

const webUrl = 'http://localhost:3000';

/**
 * The site proxy and the API share this secret in e2e, as Vercel and Render do in production. The API
 * trusts 2 hops of X-Forwarded-For only on requests that carry it (the client's own entry stands in for
 * the visitor address Vercel would add), which is how e2e/auth-proxy.spec.ts sees the header arrive.
 */
export const E2E_PROXY_SECRET = 'e2e-only-proxy-secret-not-used-anywhere-else';

/** The administrator the e2e API creates on start (ensureAdmin); these values exist only in e2e. */
export const E2E_ADMIN = { email: 'admin.e2e@yoyo.test', password: 'e2e admin passphrase only' };

/** The local stand-in for Nominatim (e2e/support/fake-nominatim.mjs), so no test calls OpenStreetMap. */
const FAKE_NOMINATIM_PORT = 4599;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env['CI']),
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: webUrl,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // The language switch is checked on an iPhone too (WebKit), where it once looked crooked.
    {
      name: 'webkit-iphone',
      use: { ...devices['iPhone 15'] },
      testMatch: /language-(switch|transition)\.spec\.ts$/,
    },
  ],
  // e2e runs against the production build (`turbo run e2e` builds first). Never reuse a running
  // server: a stale one would silently test an old build (a busy port fails loudly instead).
  webServer: [
    {
      command: 'node e2e/support/fake-nominatim.mjs',
      url: `http://127.0.0.1:${FAKE_NOMINATIM_PORT}/status`,
      env: { FAKE_NOMINATIM_PORT: String(FAKE_NOMINATIM_PORT) },
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      // The real API (built dist): the screens are tested against it, not against mocks.
      command: 'pnpm --filter @yoyo/api start:prod',
      url: 'http://localhost:4000/api/v1/health',
      // Photos on the local disk (apps/api/.uploads), the e2e administrator, and the fake Nominatim.
      env: {
        ...process.env,
        PROXY_SECRET: E2E_PROXY_SECRET,
        TRUST_PROXY_HOPS: '2',
        STORAGE: 'local',
        ADMIN_EMAIL: E2E_ADMIN.email,
        ADMIN_PASSWORD: E2E_ADMIN.password,
        NOMINATIM_URL: `http://127.0.0.1:${FAKE_NOMINATIM_PORT}`,
      } as Record<string, string>,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: 'pnpm start',
      url: webUrl,
      env: { ...process.env, PROXY_SECRET: E2E_PROXY_SECRET } as Record<string, string>,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
