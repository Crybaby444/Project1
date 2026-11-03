import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/yoyo_test',
      WEB_ORIGIN: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
    },
    // DB-backed suites share one database
    fileParallelism: false,
  },
});
