import { defineConfig, devices } from '@playwright/test';

const WEB_PORT = 3000;
const baseURL = `http://localhost:${WEB_PORT}`;
const reuse = !process.env['CI'];

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['html', { open: 'never' }], ['list']] : 'list',
  use: {
    baseURL,
    locale: 'en-US',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'pnpm --filter @yoyo/api start:prod',
      url: 'http://localhost:4000/api/v1/health',
      reuseExistingServer: reuse,
      timeout: 120_000,
    },
    {
      command: 'pnpm --filter @yoyo/web start',
      url: baseURL,
      reuseExistingServer: reuse,
      timeout: 120_000,
    },
  ],
});
