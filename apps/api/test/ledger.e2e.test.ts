import { cents, topUp, withdraw, type LedgerOperation } from '@yoyo/domain';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { LedgerService } from '../src/ledger/ledger.service';
import { resetAccounts, resetDeals } from './support/db';
import { createTestApp, type TestApp } from './support/test-app';

let t: TestApp;
let ledger: LedgerService;

beforeAll(async () => {
  t = await createTestApp();
  ledger = t.app.get(LedgerService);
});

afterAll(async () => {
  await t.close();
});

beforeEach(async () => {
  await resetDeals(t.prisma);
  await resetAccounts(t.prisma);
});

const post = (op: LedgerOperation) => t.prisma.$transaction((tx) => ledger.post(op, tx));

describe('LedgerService', () => {
  it('moves money between accounts and keeps the balances', async () => {
    await post(topUp('u1', cents(10_000)));
    await post(withdraw('u1', cents(2_500)));
    expect(await ledger.balance('wallet:u1')).toBe(7_500);
    expect(await ledger.balance('external:card')).toBe(-7_500);
    const operations = await t.prisma.ledgerOperation.findMany({ include: { entries: true }, orderBy: { createdAt: 'asc' } });
    expect(operations.map((op) => op.kind)).toEqual(['TOP_UP', 'WITHDRAWAL']);
  });

  it('refuses to take a wallet below zero and writes nothing', async () => {
    await post(topUp('u1', cents(1_000)));
    await expect(post(withdraw('u1', cents(1_001)))).rejects.toMatchObject({ code: 'INSUFFICIENT_FUNDS' });
    expect(await ledger.balance('wallet:u1')).toBe(1_000);
    expect(await t.prisma.ledgerOperation.count()).toBe(1);
  });

  it('refuses an unbalanced operation before it reaches the database', async () => {
    const bad = { kind: 'TOP_UP', postings: [{ account: 'wallet:u1', amount: 5 }] } as LedgerOperation;
    await expect(post(bad)).rejects.toMatchObject({ code: 'UNBALANCED_OPERATION' });
  });

  it('lets exactly ten of twenty parallel 10 € withdrawals through a 100 € wallet', async () => {
    await post(topUp('u1', cents(10_000)));
    const results = await Promise.allSettled(Array.from({ length: 20 }, () => post(withdraw('u1', cents(1_000)))));
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(10);
    for (const r of results) if (r.status === 'rejected') expect(r.reason).toMatchObject({ code: 'INSUFFICIENT_FUNDS' });
    expect(await ledger.balance('wallet:u1')).toBe(0);
    expect(await ledger.audit()).toEqual({ sumOfAll: 0, mismatched: [], unbalancedOperations: [], negative: [] });
  });

  it('does not deadlock when two operations lock the same accounts in opposite order', async () => {
    await post(topUp('a', cents(5_000)));
    await post(topUp('b', cents(5_000)));
    const ab = (amount: number) =>
      ({ kind: 'TOP_UP', postings: [{ account: 'wallet:a', amount: -amount }, { account: 'wallet:b', amount }] }) as LedgerOperation;
    const ba = (amount: number) =>
      ({ kind: 'TOP_UP', postings: [{ account: 'wallet:b', amount: -amount }, { account: 'wallet:a', amount }] }) as LedgerOperation;
    await Promise.all(Array.from({ length: 10 }, (_, i) => post(i % 2 ? ab(100) : ba(100))));
    expect((await ledger.balance('wallet:a')) + (await ledger.balance('wallet:b'))).toBe(10_000);
  });

  it('reports a cache that disagrees with the postings', async () => {
    await post(topUp('u1', cents(1_000)));
    await t.prisma.ledgerAccount.update({ where: { id: 'wallet:u1' }, data: { balance: 999 } });
    expect((await ledger.audit()).mismatched).toEqual([{ account: 'wallet:u1', cached: 999, fromEntries: 1_000 }]);
  });

  it('lists a wallet history, newest first, with the booking it belongs to', async () => {
    await post(topUp('u1', cents(1_000)));
    await post(withdraw('u1', cents(300)));
    const { items, total } = await ledger.walletHistory('u1', { page: 1 });
    expect(total).toBe(2);
    expect(items.map((i) => [i.kind, i.amountCents])).toEqual([
      ['WITHDRAWAL', -300],
      ['TOP_UP', 1_000],
    ]);
    expect((await ledger.walletHistory('u1', { page: 1, kind: 'TOP_UP' })).total).toBe(1);
  });
});
