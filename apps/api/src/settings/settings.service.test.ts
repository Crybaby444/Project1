import { SETTING_DEFAULTS } from '@yoyo/shared';
import 'reflect-metadata';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { runSeed } from '../../prisma/seed';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from './settings.service';

const prisma = new PrismaService({ DATABASE_URL: process.env['DATABASE_URL']! });
const settings = new SettingsService(prisma);

beforeEach(async () => {
  await prisma.setting.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('SettingsService', () => {
  it('falls back to the spec default when no row exists', async () => {
    expect(await settings.get('fees.servicePercent')).toBe(10);
    expect(await settings.get('booking.inspectionHours')).toBe(48);
  });

  it('returns the stored value after set, and the latest one after a second set', async () => {
    await settings.set('fees.servicePercent', 12);
    expect(await settings.get('fees.servicePercent')).toBe(12);
    await settings.set('fees.servicePercent', 8);
    expect(await settings.get('fees.servicePercent')).toBe(8);
  });
});

describe('runSeed', () => {
  it('creates every default exactly once, even when run twice', async () => {
    await runSeed(prisma);
    await runSeed(prisma);
    expect(await prisma.setting.count()).toBe(Object.keys(SETTING_DEFAULTS).length);
    const row = await prisma.setting.findUnique({ where: { key: 'review.windowDays' } });
    expect(row?.value).toBe(14);
  });

  it('keeps a value an admin already changed', async () => {
    await settings.set('fees.servicePercent', 15);
    await runSeed(prisma);
    expect(await settings.get('fees.servicePercent')).toBe(15);
  });
});
