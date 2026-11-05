import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
    // Form tests type into jsdom key by key. On CI, turbo runs every package's tests at once (the API's
    // against Postgres), and a form test that takes ~0.5 s locally can pass 5 s there.
    testTimeout: 20_000,
    // next-intl imports "next/navigation" without an extension; let Vite resolve it.
    server: { deps: { inline: ['next-intl'] } },
  },
});
