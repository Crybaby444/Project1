import { existsSync } from 'node:fs';
import { defineConfig } from 'prisma/config';

// Local development keeps secrets in apps/api/.env; CI and hosting pass real environment variables.
if (existsSync('.env')) process.loadEnvFile('.env');

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
