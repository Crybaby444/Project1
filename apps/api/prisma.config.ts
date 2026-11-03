import { defineConfig } from 'prisma/config';

// Prisma CLI reads DATABASE_URL from the environment (.env is loaded via process.loadEnvFile when present).
try {
  process.loadEnvFile('.env');
} catch {
  // no .env file — rely on the real environment (CI, production)
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
});
