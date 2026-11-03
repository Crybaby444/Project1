import { defineConfig, devices } from '@playwright/test';

const webUrl = 'http://localhost:3000';

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
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: 'pnpm start',
      url: webUrl,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
