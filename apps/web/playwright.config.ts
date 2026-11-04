import { defineConfig, devices } from '@playwright/test';

const webUrl = 'http://localhost:3000';

/**
 * The site proxy and the API share this secret in e2e, as Vercel and Render do in production. The API
 * trusts 2 hops of X-Forwarded-For only on requests that carry it (the client's own entry stands in for
 * the visitor address Vercel would add), which is how e2e/auth-proxy.spec.ts sees the header arrive.
 */
export const E2E_PROXY_SECRET = 'e2e-only-proxy-secret-not-used-anywhere-else';

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
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // e2e runs against the production build (`turbo run e2e` builds first). Never reuse a running
  // server: a stale one would silently test an old build (a busy port fails loudly instead).
  webServer: [
    {
      // The real API (built dist), so the styleguide can show live health.
      command: 'pnpm --filter @yoyo/api start:prod',
      url: 'http://localhost:4000/api/v1/health',
      env: { ...process.env, PROXY_SECRET: E2E_PROXY_SECRET, TRUST_PROXY_HOPS: '2' } as Record<string, string>,
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
