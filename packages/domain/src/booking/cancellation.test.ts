import { describe, expect, it } from 'vitest';
import { cents } from '../money';
import { rentRefundPercent } from '../cancellation';
import { decide } from './decide';
import { ctx, given, owner, renter } from './test-support';

describe('cancellation policies (owner, 2026-11-16, like Hygglo: the owner picks one)', () => {
  it('flexible: everything back until the start; moderate: from 5 days 50 %; strict: 14 / 7 days', () => {
    expect([10, 1].map((d) => rentRefundPercent('FLEXIBLE', d))).toEqual([100, 100]);
    expect([5, 4, 1].map((d) => rentRefundPercent('MODERATE', d))).toEqual([100, 50, 50]);
    expect([14, 13, 7, 6, 1].map((d) => rentRefundPercent('STRICT', d))).toEqual([100, 50, 50, 0, 0]);
  });

  it('a renter cancelling a moderate deal the day before gets the deposit, the fee and half the rent; the owner keeps half', () => {
    const paid = { ...given('PAID'), cancellationPolicy: 'MODERATE' as const };
    const { next, effects } = decide(paid, renter, { type: 'CANCEL', reason: 'Plans changed' }, ctx);
    expect(next.status).toBe('CANCELLED');
    expect(next.outcome).toBe('REFUNDED_PART');
    const ledger = effects.find((e) => e.kind === 'LEDGER');
    expect(ledger && ledger.kind === 'LEDGER' && ledger.operation.kind).toBe('BOOKING_PARTIAL_REFUND');
    const postings = ledger && ledger.kind === 'LEDGER' ? Object.fromEntries(ledger.operation.postings.map((p) => [p.account, p.amount])) : {};
    const rent = paid.quote.rentCents;
    expect(postings[`wallet:${paid.ownerId}`]).toBe(cents(rent / 2));
    expect(postings['external:card'] ?? postings[`wallet:${paid.renterId}`]).toBe(paid.quote.totalCents - rent / 2);
  });

  it('an owner who cancels always gives everything back, whatever the policy', () => {
    const paid = { ...given('PAID'), cancellationPolicy: 'STRICT' as const };
    const { next } = decide(paid, owner, { type: 'CANCEL', reason: 'The drill broke' }, ctx);
    expect(next.outcome).toBe('REFUNDED_ALL');
  });
});
