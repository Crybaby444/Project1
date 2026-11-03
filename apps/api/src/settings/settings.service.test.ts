import { PrismaPg } from '@prisma/adapter-pg';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { loadEnv } from '../config/env.js';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { runSeed } from '../../prisma/seed.js';
import { SettingsService } from './settings.service.js';

const env = loadEnv(process.env);
const prisma = new PrismaService(env);
const settings = new SettingsService(prisma);

describe('SettingsService (yoyo_test)', () => {
  beforeEach(async () => {
    await prisma.setting.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('returns the default when the row is missing', async () => {
    expect(await settings.get('fees.servicePercent')).toBe(10);
  });

  it('stores and reads back a value', async () => {
    await settings.set('fees.servicePercent', 12);
    expect(await settings.get('fees.servicePercent')).toBe(12);
  });

  it('seeds every default idempotently', async () => {
    const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL }) });
    await runSeed(client);
    await runSeed(client);
    expect(await prisma.setting.count()).toBe(5);
    await client.$disconnect();
  });

  it('does not overwrite values changed by an admin when seeding again', async () => {
    await settings.set('review.windowDays', 30);
    await runSeed(prisma);
    expect(await settings.get('review.windowDays')).toBe(30);
  });
});
