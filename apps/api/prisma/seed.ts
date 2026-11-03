import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { SETTING_DEFAULTS } from '@yoyo/shared';
import { PrismaClient } from '../src/generated/prisma/client';

/** Writes every default setting that is not stored yet. Safe to run repeatedly. */
export async function runSeed(prisma: PrismaClient): Promise<void> {
  for (const [key, value] of Object.entries(SETTING_DEFAULTS)) {
    await prisma.setting.upsert({ where: { key }, create: { key, value }, update: {} });
  }
}

if (typeof require !== 'undefined' && require.main === module) {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env['DATABASE_URL'] }),
  });
  runSeed(prisma)
    .then(() => console.log('Seed: settings are in place.'))
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
