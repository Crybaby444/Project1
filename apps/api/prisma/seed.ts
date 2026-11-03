import { existsSync } from 'node:fs';
import { PrismaPg } from '@prisma/adapter-pg';
import { SETTING_DEFAULTS, type SettingKey } from '@yoyo/shared';
import { PrismaClient } from '../src/generated/prisma/client';

/**
 * Writes every setting default that is still missing. Safe to run any number of times:
 * values an admin already changed are never overwritten.
 */
export async function runSeed(prisma: PrismaClient): Promise<void> {
  for (const key of Object.keys(SETTING_DEFAULTS) as SettingKey[]) {
    await prisma.setting.upsert({
      where: { key },
      create: { key, value: SETTING_DEFAULTS[key] },
      update: {},
    });
  }
}

// `prisma db seed` runs this file directly (CommonJS); importing it from tests must not trigger the run.
if (typeof module !== 'undefined' && require.main === module) {
  if (existsSync('.env')) process.loadEnvFile('.env');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env['DATABASE_URL'] }) });
  runSeed(prisma)
    .then(() => console.log('Seeded setting defaults.'))
    .finally(() => prisma.$disconnect());
}
