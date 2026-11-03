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
  // e2e runs against the production build (`turbo run e2e` builds first).
  webServer: [
    {
      command: 'pnpm start',
      url: webUrl,
      reuseExistingServer: !process.env['CI'],
      timeout: 120_000,
    },
  ],
});
