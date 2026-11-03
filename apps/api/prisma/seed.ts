import { pathToFileURL } from 'node:url';
import { PrismaPg } from '@prisma/adapter-pg';
import { SETTING_DEFAULTS, SETTING_KEYS } from '@yoyo/shared';
import { PrismaClient } from '../src/generated/prisma/client.js';

/** Writes every SETTING_DEFAULTS entry that is missing; existing values are left untouched. */
export async function runSeed(prisma: PrismaClient): Promise<void> {
  for (const key of SETTING_KEYS) {
    await prisma.setting.upsert({
      where: { key },
      create: { key, value: SETTING_DEFAULTS[key] },
      update: {},
    });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required to seed');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  try {
    await runSeed(prisma);
    console.log(`Seeded ${SETTING_KEYS.length} settings`);
  } finally {
    await prisma.$disconnect();
  }
}
