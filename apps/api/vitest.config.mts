import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    // SWC keeps decorator metadata, which Nest dependency injection relies on.
    swc.vite({ module: { type: 'es6' } }),
  ],
  test: {
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    // Tests share one database, so files run one after another.
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: process.env['TEST_DATABASE_URL'] ?? 'postgresql://localhost:5432/yoyo_test',
      WEB_ORIGIN: 'http://localhost:3000',
    },
  },
});
