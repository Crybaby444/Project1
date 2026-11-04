import { existsSync } from 'node:fs';
import { PrismaPg } from '@prisma/adapter-pg';
import { SETTING_DEFAULTS, type SettingKey } from '@yoyo/shared';
import { ensureAdmin, type AdminEnv } from '../src/admin/ensure-admin';
import { PasswordService } from '../src/auth/password.service';
import { SystemClock } from '../src/clock/clock';
import { EnvSchema } from '../src/config/env';
import { PrismaClient } from '../src/generated/prisma/client';

export interface SeedAdmin {
  passwords: { hash(plain: string): Promise<string> };
  env: AdminEnv;
}

/**
 * Writes every setting default that is still missing, and with `admin` also ensures the administrator
 * account (ADMIN_EMAIL / ADMIN_PASSWORD). Safe to run any number of times: values an admin already
 * changed, and the password of a confirmed admin account, are never overwritten.
 */
export async function runSeed(prisma: PrismaClient, admin?: SeedAdmin): Promise<void> {
  for (const key of Object.keys(SETTING_DEFAULTS) as SettingKey[]) {
    await prisma.setting.upsert({
      where: { key },
      create: { key, value: SETTING_DEFAULTS[key] },
      update: {},
    });
  }
  if (admin) await ensureAdmin(prisma, admin.passwords, admin.env, new SystemClock().now());
}

// `prisma db seed` runs this file directly (CommonJS); importing it from tests must not trigger the run.
if (typeof module !== 'undefined' && require.main === module) {
  if (existsSync('.env')) process.loadEnvFile('.env');
  const env = EnvSchema.parse(process.env);
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL }) });
  runSeed(prisma, { passwords: new PasswordService(), env })
    .then(() => console.log('Seeded setting defaults (and the admin account, if ADMIN_EMAIL/ADMIN_PASSWORD are set).'))
    .finally(() => prisma.$disconnect());
}
