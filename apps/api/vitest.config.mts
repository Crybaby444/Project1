import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';
import { testDatabaseUrl } from './test/test-db.mjs';

export default defineConfig({
  plugins: [
    // SWC keeps decorator metadata, which Nest dependency injection relies on.
    swc.vite({ module: { type: 'es6' } }),
  ],
  test: {
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    globalSetup: ['test/global-setup.mts'],
    // Tests share one database, so files run one after another.
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: testDatabaseUrl,
      WEB_ORIGIN: 'http://localhost:3000',
      // Test-only key; production gets a generated one from Render (render.yaml).
      JWT_SECRET: 'test-only-jwt-secret-0123456789abcdef',
    },
  },
});
