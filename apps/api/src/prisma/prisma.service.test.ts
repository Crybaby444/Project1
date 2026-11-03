import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { PrismaService } from './prisma.service';

describe('PrismaService.isHealthy', () => {
  it('is true against the reachable test database', async () => {
    const prisma = new PrismaService({ DATABASE_URL: process.env['DATABASE_URL']! });
    await expect(prisma.isHealthy()).resolves.toBe(true);
    await prisma.$disconnect();
  });

  it('is false, without throwing, when the database is unreachable', async () => {
    const prisma = new PrismaService({ DATABASE_URL: 'postgresql://localhost:5999/nowhere' });
    await expect(prisma.isHealthy()).resolves.toBe(false);
    await prisma.$disconnect();
  });
});
