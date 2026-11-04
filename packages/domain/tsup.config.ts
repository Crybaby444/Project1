import { defineConfig } from 'tsup';

// Same output as @yoyo/shared: ESM and CommonJS with type declarations.
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
});
