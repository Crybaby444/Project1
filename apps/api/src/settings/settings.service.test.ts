import { loadEnv } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import { runSeed } from '../../prisma/seed';
import { SettingsService } from './settings.service';

describe('SettingsService (real database)', () => {
  const prisma = new PrismaService(loadEnv(process.env));
  const settings = new SettingsService(prisma);

  beforeEach(async () => {
    await prisma.setting.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('returns the default when no row exists', async () => {
    expect(await settings.get('fees.servicePercent')).toBe(10);
  });

  it('stores and reads back a value', async () => {
    await settings.set('fees.servicePercent', 12);
    expect(await settings.get('fees.servicePercent')).toBe(12);
  });

  it('seeds idempotently', async () => {
    await runSeed(prisma);
    await runSeed(prisma);
    expect(await prisma.setting.count()).toBe(5);
  });

  it('does not overwrite an edited value when seeding again', async () => {
    await settings.set('review.windowDays', 30);
    await runSeed(prisma);
    expect(await settings.get('review.windowDays')).toBe(30);
  });
});
