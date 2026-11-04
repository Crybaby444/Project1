import { describe, expect, it } from 'vitest';
import {
  applyOperation,
  assertBalanced,
  bookingPayment,
  bookingRefund,
  depositRefund,
  depositToOwner,
  rentRelease,
  topUp,
  withdraw,
} from './ledger';
import type { AccountId, LedgerOperation } from './ledger';
import { cents } from './money';
import { quote } from './pricing';

const code = (expected: string) => expect.objectContaining({ code: expected });

const quoteFor = (depositCents: number, servicePercent = 10) =>
  quote({
    pricing: {
      dailyCents: cents(1500),
      weeklyDiscountPercent: 20,
      depositCents: cents(depositCents),
      minDays: 1,
      maxDays: 30,
    },
    days: 3,
    servicePercent,
  });

/** 3 days × 15 €: rent 45 €, fee 4.50 €, deposit 100 €, total 149.50 €. */
const q = quoteFor(10000);
const booking = { bookingId: 'b1', renterId: 'r1', ownerId: 'o1' };

const sumOf = (op: LedgerOperation) => op.postings.reduce((sum, posting) => sum + posting.amount, 0);
const balanceOf = (balances: ReadonlyMap<AccountId, number>, account: AccountId) =>
  balances.get(account) ?? 0;

describe('operations', () => {
  it('each one balances to zero, with whole non-zero postings', () => {
    const operations = [
      topUp('r1', cents(5000)),
      withdraw('r1', cents(2000)),
      bookingPayment({ ...booking, quote: q, method: 'WALLET' }),
      bookingPayment({ ...booking, quote: q, method: 'CARD' }),
      rentRelease({ ...booking, rentCents: q.rentCents }),
      depositRefund({ ...booking, depositCents: q.depositCents, method: 'WALLET' }),
      depositRefund({ ...booking, depositCents: q.depositCents, method: 'CARD' }),
      depositToOwner({ ...booking, depositCents: q.depositCents }),
      bookingRefund({ ...booking, quote: q, method: 'WALLET' }),
      bookingRefund({ ...booking, quote: q, method: 'CARD' }),
    ];
    for (const op of operations) {
      expect(op).not.toBeNull();
      expect(sumOf(op!)).toBe(0);
      expect(() => assertBalanced(op!)).not.toThrow();
      expect(op!.postings.every((p) => Number.isSafeInteger(p.amount) && p.amount !== 0)).toBe(true);
    }
  });

  it('a top-up brings money from the card into the wallet, a withdrawal sends it back', () => {
    expect(topUp('r1', cents(5000))).toEqual({
      kind: 'TOP_UP',
      postings: [
        { account: 'external:card', amount: -5000 },
        { account: 'wallet:r1', amount: 5000 },
      ],
    });
    expect(withdraw('r1', cents(2000))).toEqual({
      kind: 'WITHDRAWAL',
      postings: [
        { account: 'wallet:r1', amount: -2000 },
        { account: 'external:card', amount: 2000 },
      ],
    });
  });

  it('a payment splits the total: rent into escrow, the deposit frozen, the fee to Yoyo', () => {
    expect(bookingPayment({ ...booking, quote: q, method: 'WALLET' })).toEqual({
      kind: 'BOOKING_PAYMENT',
      bookingId: 'b1',
      postings: [
        { account: 'wallet:r1', amount: -14950 },
        { account: 'escrow:b1', amount: 4500 },
        { account: 'deposit:b1', amount: 10000 },
        { account: 'platform:revenue', amount: 450 },
      ],
    });
  });

  it('releases the rent from escrow to the owner', () => {
    expect(rentRelease({ ...booking, rentCents: q.rentCents })).toEqual({
      kind: 'RENT_RELEASE',
      bookingId: 'b1',
      postings: [
        { account: 'escrow:b1', amount: -4500 },
        { account: 'wallet:o1', amount: 4500 },
      ],
    });
  });

  it('returns the deposit the way it was paid (spec §0)', () => {
    expect(depositRefund({ ...booking, depositCents: q.depositCents, method: 'WALLET' })).toEqual({
      kind: 'DEPOSIT_REFUND',
      bookingId: 'b1',
      postings: [
        { account: 'deposit:b1', amount: -10000 },
        { account: 'wallet:r1', amount: 10000 },
      ],
    });
    expect(depositRefund({ ...booking, depositCents: q.depositCents, method: 'CARD' })?.postings).toEqual([
      { account: 'deposit:b1', amount: -10000 },
      { account: 'external:card', amount: 10000 },
    ]);
  });

  it('gives the deposit to the owner', () => {
    expect(depositToOwner({ ...booking, depositCents: q.depositCents })).toEqual({
      kind: 'DEPOSIT_TO_OWNER',
      bookingId: 'b1',
      postings: [
        { account: 'deposit:b1', amount: -10000 },
        { account: 'wallet:o1', amount: 10000 },
      ],
    });
  });

  it('refunds everything the way it was paid, taking the fee back from Yoyo', () => {
    expect(bookingRefund({ ...booking, quote: q, method: 'WALLET' })).toEqual({
      kind: 'BOOKING_REFUND',
      bookingId: 'b1',
      postings: [
        { account: 'escrow:b1', amount: -4500 },
        { account: 'deposit:b1', amount: -10000 },
        { account: 'platform:revenue', amount: -450 },
        { account: 'wallet:r1', amount: 14950 },
      ],
    });
  });

  it('refuses a top-up or withdrawal of nothing', () => {
    expect(() => topUp('r1', cents(0))).toThrow(code('INVALID_AMOUNT'));
    expect(() => withdraw('r1', cents(0))).toThrow(code('INVALID_AMOUNT'));
  });

  it('refuses an empty user or booking id, which would name a shared account', () => {
    expect(() => topUp('', cents(100))).toThrow(code('INVALID_INPUT'));
    expect(() => bookingPayment({ ...booking, bookingId: '', quote: q, method: 'CARD' })).toThrow(
      code('INVALID_INPUT'),
    );
    expect(() => rentRelease({ ...booking, ownerId: '', rentCents: q.rentCents })).toThrow(
      code('INVALID_INPUT'),
    );
  });

  it('refuses an unknown payment method', () => {
    expect(() => bookingPayment({ ...booking, quote: q, method: 'CASH' as 'CARD' })).toThrow(
      code('INVALID_INPUT'),
    );
  });

  it('refuses a quote whose parts do not add up to its total', () => {
    expect(() =>
      bookingPayment({ ...booking, quote: { ...q, totalCents: cents(14951) }, method: 'CARD' }),
    ).toThrow(code('UNBALANCED_OPERATION'));
  });
});

describe('zero amounts', () => {
  it('make no postings: no deposit means no deposit:* line in the payment', () => {
    const free = quoteFor(0);
    const payment = bookingPayment({ ...booking, quote: free, method: 'CARD' });
    expect(payment.postings.map((p) => p.account)).toEqual([
      'external:card',
      'escrow:b1',
      'platform:revenue',
    ]);
    expect(bookingRefund({ ...booking, quote: free, method: 'CARD' }).postings.map((p) => p.account)).toEqual(
      ['escrow:b1', 'platform:revenue', 'external:card'],
    );
  });

  it('make no postings: a zero fee means no platform:revenue line', () => {
    const noFee = quoteFor(10000, 0);
    expect(
      bookingPayment({ ...booking, quote: noFee, method: 'CARD' }).postings.map((p) => p.account),
    ).toEqual(['external:card', 'escrow:b1', 'deposit:b1']);
  });

  it('turn an operation with nothing to move into null, not an empty operation', () => {
    expect(depositRefund({ ...booking, depositCents: cents(0), method: 'WALLET' })).toBeNull();
    expect(depositToOwner({ ...booking, depositCents: cents(0) })).toBeNull();
    expect(rentRelease({ ...booking, rentCents: cents(0) })).toBeNull();
  });
});

describe('assertBalanced', () => {
  it('refuses postings that do not sum to zero', () => {
    const op: LedgerOperation = {
      kind: 'TOP_UP',
      postings: [
        { account: 'external:card', amount: -100 },
        { account: 'wallet:r1', amount: 99 },
      ],
    };
    expect(() => assertBalanced(op)).toThrow(
      expect.objectContaining({
        code: 'UNBALANCED_OPERATION',
        details: expect.objectContaining({ sum: -1 }),
      }),
    );
  });

  it.each([0, 0.5, Number.NaN])('refuses a posting of %s', (amount) => {
    const op: LedgerOperation = {
      kind: 'TOP_UP',
      postings: [
        { account: 'external:card', amount: -amount },
        { account: 'wallet:r1', amount },
      ],
    };
    expect(() => assertBalanced(op)).toThrow(code('UNBALANCED_OPERATION'));
  });
});

describe('applyOperation', () => {
  it('returns new balances and leaves the old ones alone', () => {
    const before = new Map<AccountId, number>();
    const after = applyOperation(before, topUp('r1', cents(20000)));
    expect(before.size).toBe(0);
    expect(after).toEqual(
      new Map<AccountId, number>([
        ['external:card', -20000],
        ['wallet:r1', 20000],
      ]),
    );
  });

  it('refuses a wallet payment the wallet cannot cover', () => {
    const balances = applyOperation(new Map(), topUp('r1', cents(14949)));
    expect(() =>
      applyOperation(balances, bookingPayment({ ...booking, quote: q, method: 'WALLET' })),
    ).toThrow(
      expect.objectContaining({
        code: 'INSUFFICIENT_FUNDS',
        details: { account: 'wallet:r1', availableCents: 14949, shortfallCents: 1 },
      }),
    );
  });

  it('refuses to take more out of escrow or a deposit than it holds', () => {
    expect(() => applyOperation(new Map(), rentRelease({ ...booking, rentCents: q.rentCents })!)).toThrow(
      code('NEGATIVE_BALANCE'),
    );
    expect(() =>
      applyOperation(new Map(), depositToOwner({ ...booking, depositCents: q.depositCents })!),
    ).toThrow(code('NEGATIVE_BALANCE'));
  });

  it('lets the card and Yoyo’s revenue go below zero', () => {
    const giveBackFee: LedgerOperation = {
      kind: 'BOOKING_REFUND',
      bookingId: 'b1',
      postings: [
        { account: 'platform:revenue', amount: -450 },
        { account: 'external:card', amount: 450 },
      ],
    };
    expect(applyOperation(new Map(), giveBackFee).get('platform:revenue')).toBe(-450);
    expect(applyOperation(new Map(), topUp('r1', cents(100))).get('external:card')).toBe(-100);
  });

  it('refuses an unbalanced operation', () => {
    const op: LedgerOperation = { kind: 'TOP_UP', postings: [{ account: 'wallet:r1', amount: 100 }] };
    expect(() => applyOperation(new Map(), op)).toThrow(code('UNBALANCED_OPERATION'));
  });

  it('after a wallet payment and its refund, every account but the card is back where it was', () => {
    const start = applyOperation(new Map(), topUp('r1', cents(20000)));
    const paid = applyOperation(start, bookingPayment({ ...booking, quote: q, method: 'WALLET' }));
    expect(balanceOf(paid, 'wallet:r1')).toBe(20000 - 14950);
    const refunded = applyOperation(paid, bookingRefund({ ...booking, quote: q, method: 'WALLET' }));
    for (const account of new Set([...start.keys(), ...paid.keys(), ...refunded.keys()])) {
      if (account !== 'external:card')
        expect([account, balanceOf(refunded, account)]).toEqual([account, balanceOf(start, account)]);
    }
  });

  it('shows a card payment and its refund only on the card, never in the renter’s wallet', () => {
    const payment = bookingPayment({ ...booking, quote: q, method: 'CARD' });
    const refund = bookingRefund({ ...booking, quote: q, method: 'CARD' });
    const accounts = [...payment.postings, ...refund.postings].map((p) => p.account);
    expect(accounts).toContain('external:card');
    expect(accounts.filter((account) => account.startsWith('wallet:'))).toEqual([]);

    const afterRefund = applyOperation(applyOperation(new Map(), payment), refund);
    expect(balanceOf(afterRefund, 'escrow:b1')).toBe(0);
    expect(balanceOf(afterRefund, 'deposit:b1')).toBe(0);
    expect(balanceOf(afterRefund, 'platform:revenue')).toBe(0);
    expect(balanceOf(afterRefund, 'external:card')).toBe(0);
  });
});
