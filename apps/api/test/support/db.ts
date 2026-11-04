import type { PrismaClient } from '../../src/generated/prisma/client';

/** Empties every account table (tokens, codes and OAuth links go with their users). */
export async function resetAccounts(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "User" CASCADE');
}

/** Empties the deal and ledger tables (bookings go with their users and listings; the ledger does not). */
export async function resetDeals(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "LedgerEntry", "LedgerOperation", "LedgerAccount", "IdempotencyKey", "Booking", "Offer", "Payment", "Payout" CASCADE',
  );
}
