import { Injectable } from '@nestjs/common';
import { applyOperation, assertBalanced, type AccountId, type LedgerOperation, type OperationKind } from '@yoyo/domain';
import { WALLET_PAGE_SIZE, type WalletTransaction } from '@yoyo/shared';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Accounts outside Yoyo's books: their balance may go below zero (see LedgerAccount_balance_floor). */
const OUTSIDE: ReadonlySet<string> = new Set(['external:card', 'platform:revenue']);

export const walletAccount = (userId: string): AccountId => `wallet:${userId}`;

export interface LedgerAudit {
  /** Sum of every posting ever written: always 0. */
  sumOfAll: number;
  /** Accounts whose cached balance differs from the sum of their postings. */
  mismatched: { account: string; cached: number; fromEntries: number }[];
  /** Operations whose postings do not sum to zero. */
  unbalancedOperations: string[];
  /** Wallets, escrow or deposits below zero. */
  negative: string[];
}

/**
 * The double-entry journal (spec §4.5). Every money movement is one operation of @yoyo/domain, written
 * with its postings and the new balances in the caller's transaction. Balances live in LedgerAccount as
 * a cache of the postings; the rows are locked in a fixed order, so concurrent operations queue instead
 * of deadlocking or spending the same money twice.
 */
@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Writes `op` in `tx`: checks it balances, locks its accounts (sorted by id), applies it with the core's
   * `applyOperation` (INSUFFICIENT_FUNDS, NEGATIVE_BALANCE) and stores the operation, postings and
   * balances. Returns the operation's id.
   */
  async post(op: LedgerOperation, tx: Prisma.TransactionClient, meta: { userId?: string } = {}): Promise<string> {
    assertBalanced(op);
    const balances = await this.lock(
      op.postings.map((p) => p.account),
      tx,
    );
    const next = applyOperation(balances, op);
    const created = await tx.ledgerOperation.create({
      data: {
        kind: op.kind,
        bookingId: op.bookingId ?? null,
        userId: meta.userId ?? null,
        entries: { create: op.postings.map((p) => ({ account: p.account, amount: p.amount })) },
      },
    });
    for (const [account, balance] of next) {
      if (balances.get(account) !== balance) await tx.ledgerAccount.update({ where: { id: account }, data: { balance } });
    }
    return created.id;
  }

  /**
   * Locks the accounts (creating missing ones at 0) in id order and returns their balances. Callers that
   * need a balance to decide (paying from the wallet) lock it with this before `post`.
   */
  async lock(accounts: readonly string[], tx: Prisma.TransactionClient): Promise<Map<AccountId, number>> {
    const ids = [...new Set(accounts)].sort();
    await tx.$executeRaw`
      INSERT INTO "LedgerAccount" (id, balance, "updatedAt")
      SELECT id, 0, now() FROM unnest(${ids}::text[]) AS id ORDER BY id
      ON CONFLICT (id) DO NOTHING`;
    const rows = await tx.$queryRaw<{ id: string; balance: number }[]>`
      SELECT id, balance FROM "LedgerAccount" WHERE id = ANY(${ids}::text[]) ORDER BY id FOR UPDATE`;
    return new Map(rows.map((row) => [row.id as AccountId, row.balance]));
  }

  /** The cached balance of an account (0 when it never had a posting). */
  async balance(account: string, tx: Prisma.TransactionClient = this.prisma): Promise<number> {
    return (await tx.ledgerAccount.findUnique({ where: { id: account } }))?.balance ?? 0;
  }

  /** Postings of the user's wallet, newest first, `WALLET_PAGE_SIZE` a page. */
  async walletHistory(userId: string, query: { page: number; kind?: OperationKind }): Promise<{ items: WalletTransaction[]; total: number }> {
    const where: Prisma.LedgerEntryWhereInput = {
      account: walletAccount(userId),
      ...(query.kind && { operation: { kind: query.kind } }),
    };
    const [rows, total] = await Promise.all([
      this.prisma.ledgerEntry.findMany({
        where,
        include: { operation: true },
        orderBy: { id: 'desc' },
        skip: (query.page - 1) * WALLET_PAGE_SIZE,
        take: WALLET_PAGE_SIZE,
      }),
      this.prisma.ledgerEntry.count({ where }),
    ]);
    return {
      items: rows.map((row) => ({
        id: row.operation.id,
        kind: row.operation.kind,
        amountCents: row.amount,
        bookingId: row.operation.bookingId,
        createdAt: row.operation.createdAt.toISOString(),
      })),
      total,
    };
  }

  /** Checks the whole journal; every list is empty and the sum 0 when the books are right. */
  async audit(): Promise<LedgerAudit> {
    const [sum] = await this.prisma.$queryRaw<{ total: bigint | null }[]>`SELECT SUM(amount) AS total FROM "LedgerEntry"`;
    const mismatched = await this.prisma.$queryRaw<{ account: string; cached: number; fromEntries: bigint }[]>`
      SELECT COALESCE(a.id, e.account) AS account, COALESCE(a.balance, 0) AS cached, COALESCE(e.total, 0) AS "fromEntries"
      FROM "LedgerAccount" a
      FULL OUTER JOIN (SELECT account, SUM(amount) AS total FROM "LedgerEntry" GROUP BY account) e ON e.account = a.id
      WHERE COALESCE(a.balance, 0) <> COALESCE(e.total, 0)
      ORDER BY 1`;
    const unbalanced = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT "operationId" AS id FROM "LedgerEntry" GROUP BY "operationId" HAVING SUM(amount) <> 0 ORDER BY 1`;
    const negative = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "LedgerAccount" WHERE balance < 0 ORDER BY 1`;
    return {
      sumOfAll: Number(sum?.total ?? 0),
      mismatched: mismatched.map((m) => ({ account: m.account, cached: Number(m.cached), fromEntries: Number(m.fromEntries) })),
      unbalancedOperations: unbalanced.map((u) => u.id),
      negative: negative.map((n) => n.id).filter((id) => !OUTSIDE.has(id)),
    };
  }
}
