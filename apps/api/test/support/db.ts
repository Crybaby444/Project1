import type { PrismaClient } from '../../src/generated/prisma/client';

/** Empties every account table (tokens, codes and OAuth links go with their users). */
export async function resetAccounts(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "User" CASCADE');
}
