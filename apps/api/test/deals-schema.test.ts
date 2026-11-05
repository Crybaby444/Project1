import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service';
import { resetAccounts, resetDeals } from './support/db';

const prisma = new PrismaService({ DATABASE_URL: process.env['DATABASE_URL']! });

beforeEach(async () => {
  await resetDeals(prisma);
  await resetAccounts(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function user(): Promise<string> {
  return (await prisma.user.create({ data: { email: `u-${randomUUID()}@mail.lv`, name: 'U' } })).id;
}

async function listing(ownerId: string): Promise<string> {
  return (await prisma.listing.create({ data: { ownerId, status: 'PUBLISHED' } })).id;
}

/** A booking row with only what the table requires; `reserved` is set by raw SQL like the API does. */
async function booking(
  listingId: string,
  ownerId: string,
  renterId: string,
  start: string,
  end: string,
  status: 'REQUESTED' | 'ACCEPTED' = 'ACCEPTED',
): Promise<string> {
  const row = await prisma.booking.create({
    data: {
      listingId,
      ownerId,
      renterId,
      status,
      start: new Date(`${start}T00:00:00Z`),
      end: new Date(`${end}T00:00:00Z`),
      timeZone: 'Europe/Riga',
      days: 3,
      dailyCents: 1500,
      baseCents: 4500,
      discountPercent: 0,
      discountCents: 0,
      rentCents: 4500,
      serviceFeeCents: 450,
      depositCents: 10000,
      totalCents: 14950,
      ownerPayoutCents: 4500,
      priceSource: 'LISTED',
    },
  });
  return row.id;
}

const reserve = (id: string) =>
  prisma.$executeRaw`UPDATE "Booking" SET reserved = daterange("start", "end", '[]') WHERE id = ${id}`;

async function postRaw(entries: [string, number][]): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const op = await tx.ledgerOperation.create({ data: { kind: 'TOP_UP' } });
    for (const [account, amount] of entries) {
      await tx.ledgerEntry.create({ data: { operationId: op.id, account, amount } });
    }
  });
}

describe('deal tables', () => {
  it('refuses two reservations of the same listing whose days overlap, even written by hand (23P01)', async () => {
    const owner = await user();
    const renter = await user();
    const item = await listing(owner);
    const a = await booking(item, owner, renter, '2027-03-01', '2027-03-05');
    const b = await booking(item, owner, renter, '2027-03-05', '2027-03-08');
    await reserve(a);
    await expect(reserve(b)).rejects.toThrow(/Booking_no_double_booking|23P01|conflicting key/);
  });

  it('allows reservations that do not overlap, on other listings, or not reserved at all', async () => {
    const owner = await user();
    const renter = await user();
    const item = await listing(owner);
    const other = await listing(owner);
    const a = await booking(item, owner, renter, '2027-03-01', '2027-03-05');
    const b = await booking(item, owner, renter, '2027-03-06', '2027-03-08');
    const c = await booking(other, owner, renter, '2027-03-01', '2027-03-05');
    await booking(item, owner, renter, '2027-03-01', '2027-03-05');
    await reserve(a);
    await reserve(b);
    await reserve(c);
    expect(await prisma.booking.count()).toBe(4);
  });

  it('keeps one open request per renter and listing', async () => {
    const owner = await user();
    const renter = await user();
    const item = await listing(owner);
    await booking(item, owner, renter, '2027-03-01', '2027-03-02', 'REQUESTED');
    await expect(booking(item, owner, renter, '2027-04-01', '2027-04-02', 'REQUESTED')).rejects.toMatchObject({ code: 'P2002' });
    await booking(item, owner, await user(), '2027-03-01', '2027-03-02', 'REQUESTED');
    await booking(await listing(owner), owner, renter, '2027-03-01', '2027-03-02', 'REQUESTED');
  });

  it('refuses a booking that ends before it starts', async () => {
    const owner = await user();
    const item = await listing(owner);
    await expect(booking(item, owner, await user(), '2027-03-05', '2027-03-01')).rejects.toThrow();
  });
});

describe('ledger tables', () => {
  it('accepts a balanced operation', async () => {
    await postRaw([
      ['external:card', -1000],
      ['wallet:x', 1000],
    ]);
    expect(await prisma.ledgerEntry.count()).toBe(2);
  });

  it('refuses an operation whose postings do not sum to zero, at commit', async () => {
    await expect(
      postRaw([
        ['external:card', -1000],
        ['wallet:x', 999],
      ]),
    ).rejects.toThrow(/unbalanced/i);
    expect(await prisma.ledgerOperation.count()).toBe(0);
  });

  it('refuses a zero posting', async () => {
    await expect(postRaw([['wallet:x', 0]])).rejects.toThrow();
  });

  it('never lets a posting change or disappear', async () => {
    await postRaw([
      ['external:card', -1000],
      ['wallet:x', 1000],
    ]);
    await expect(prisma.$executeRaw`UPDATE "LedgerEntry" SET amount = 5 WHERE account = 'wallet:x'`).rejects.toThrow(/immutable/i);
    await expect(prisma.$executeRaw`DELETE FROM "LedgerEntry"`).rejects.toThrow(/immutable/i);
  });

  it('keeps wallets, escrow and deposits at zero or above, while the card and revenue may go below', async () => {
    for (const id of ['wallet:x', 'escrow:b', 'deposit:b']) {
      await expect(prisma.ledgerAccount.create({ data: { id, balance: -1 } })).rejects.toThrow();
    }
    await prisma.ledgerAccount.create({ data: { id: 'external:card', balance: -1 } });
    await prisma.ledgerAccount.create({ data: { id: 'platform:revenue', balance: -1 } });
  });

  it('never refunds more than a payment took', async () => {
    const userId = await user();
    await expect(
      prisma.payment.create({
        data: { userId, purpose: 'TOP_UP', amountCents: 1000, refundedCents: 1001, providerRef: 'ch_1', brand: 'visa', last4: '4242' },
      }),
    ).rejects.toThrow();
  });
});
