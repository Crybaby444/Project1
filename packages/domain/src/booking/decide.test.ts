import { describe, expect, it } from 'vitest';
import { endOfDayIn, localDate, period } from '../dates';
import { DomainError } from '../errors';
import { bookingPayment, bookingRefund, depositRefund, rentRelease } from '../ledger';
import { cents } from '../money';
import { availableActions } from './actions';
import { decide } from './decide';
import { createRequest } from './request';
import {
  HOUR_MS,
  NOW,
  OWNER_ID,
  RENTER_ID,
  SAMPLE,
  SAMPLE_EVENTS,
  admin,
  at,
  ctx,
  given,
  later,
  owner,
  renter,
  requestInput,
  step,
  stranger,
  system,
} from './test-support';
import { BOOKING_STATUSES } from './types';
import type {
  Actor,
  ActorKind,
  BookingEvent,
  BookingEventType,
  BookingOutcome,
  BookingSnapshot,
  BookingStatus,
  DecideContext,
  Decision,
  Effect,
} from './types';

const code = (expected: string) => expect.objectContaining({ code: expected });
const hoursAfterNow = (hours: number) => new Date(NOW.getTime() + hours * HOUR_MS);

/** One line per effect, as the plan's table names it. */
function describeEffect(effect: Effect): string {
  switch (effect.kind) {
    case 'LEDGER':
      return `LEDGER ${effect.operation.kind}`;
    case 'SCHEDULE':
    case 'CANCEL_TIMER':
      return `${effect.kind} ${effect.timer}`;
    case 'NOTIFY':
      return `NOTIFY ${effect.to} ${effect.template}`;
    case 'SYSTEM_MESSAGE':
      return `SYSTEM_MESSAGE ${effect.template}`;
    default:
      return effect.kind;
  }
}

const ledgerOf = (d: Decision) =>
  d.effects.flatMap((effect) => (effect.kind === 'LEDGER' ? [effect.operation] : []));

const afterRentalEnded: DecideContext = { ...ctx, now: new Date('2026-11-12T22:30:00Z') }; // 13 Nov, 00:30 in Riga

interface Row {
  readonly name: string;
  readonly from: () => BookingSnapshot;
  readonly actor: Actor;
  readonly event: BookingEvent;
  readonly when?: (s: BookingSnapshot) => DecideContext;
  readonly status: BookingStatus;
  readonly outcome?: BookingOutcome;
  readonly effects: readonly string[];
}

const resolve = (
  decision: 'REFUND_DEPOSIT' | 'DEPOSIT_TO_OWNER' | 'REFUND_ALL' | 'CONFIRM_HANDOVER',
): BookingEvent => ({
  type: 'RESOLVE',
  decision,
  comment: SAMPLE.comment,
});
const resolved = [
  'NOTIFY RENTER DISPUTE_RESOLVED',
  'NOTIFY OWNER DISPUTE_RESOLVED',
  'SYSTEM_MESSAGE DISPUTE_RESOLVED',
];

/** The plan's transition table (Task 5), row by row. */
const TABLE: readonly Row[] = [
  {
    name: 'REQUESTED → ACCEPT by the owner → ACCEPTED',
    from: () => given('REQUESTED'),
    actor: owner,
    event: { type: 'ACCEPT' },
    status: 'ACCEPTED',
    effects: [
      'CANCEL_TIMER REQUEST_EXPIRY',
      'SCHEDULE PAYMENT_EXPIRY',
      'RESERVE_DATES',
      'GENERATE_CONTRACT',
      'NOTIFY RENTER ACCEPTED',
      'SYSTEM_MESSAGE ACCEPTED',
    ],
  },
  {
    name: 'REQUESTED → DECLINE by the owner → DECLINED',
    from: () => given('REQUESTED'),
    actor: owner,
    event: { type: 'DECLINE', reason: 'Busy that week' },
    status: 'DECLINED',
    effects: ['CANCEL_TIMER REQUEST_EXPIRY', 'NOTIFY RENTER DECLINED', 'SYSTEM_MESSAGE DECLINED'],
  },
  {
    name: 'REQUESTED → WITHDRAW by the renter → CANCELLED',
    from: () => given('REQUESTED'),
    actor: renter,
    event: { type: 'WITHDRAW' },
    status: 'CANCELLED',
    effects: ['CANCEL_TIMER REQUEST_EXPIRY', 'NOTIFY OWNER CANCELLED', 'SYSTEM_MESSAGE CANCELLED'],
  },
  {
    name: 'REQUESTED → TIMEOUT REQUEST_EXPIRY → EXPIRED',
    from: () => given('REQUESTED'),
    actor: system,
    event: { type: 'TIMEOUT', timer: 'REQUEST_EXPIRY' },
    when: (s) => at(s, 'REQUEST_EXPIRY'),
    status: 'EXPIRED',
    effects: ['NOTIFY RENTER EXPIRED', 'NOTIFY OWNER EXPIRED', 'SYSTEM_MESSAGE EXPIRED'],
  },
  {
    name: 'ACCEPTED → SIGN by the renter → ACCEPTED',
    from: () => given('ACCEPTED'),
    actor: renter,
    event: { type: 'SIGN' },
    status: 'ACCEPTED',
    effects: ['SYSTEM_MESSAGE SIGNED'],
  },
  {
    name: 'ACCEPTED → SIGN by the owner → ACCEPTED',
    from: () => given('ACCEPTED', { renterSigned: true }),
    actor: owner,
    event: { type: 'SIGN' },
    status: 'ACCEPTED',
    effects: ['SYSTEM_MESSAGE SIGNED'],
  },
  {
    name: 'ACCEPTED → PAY by card → PAID',
    from: () => given('ACCEPTED', { renterSigned: true, ownerSigned: true }),
    actor: renter,
    event: { type: 'PAY', method: 'CARD' },
    status: 'PAID',
    effects: [
      'CANCEL_TIMER PAYMENT_EXPIRY',
      'LEDGER BOOKING_PAYMENT',
      'NOTIFY OWNER PAID',
      'SYSTEM_MESSAGE PAID',
    ],
  },
  {
    name: 'ACCEPTED → PAY from the wallet → PAID',
    from: () => given('ACCEPTED', { renterSigned: true, ownerSigned: true }),
    actor: renter,
    event: { type: 'PAY', method: 'WALLET' },
    status: 'PAID',
    effects: [
      'CANCEL_TIMER PAYMENT_EXPIRY',
      'LEDGER BOOKING_PAYMENT',
      'NOTIFY OWNER PAID',
      'SYSTEM_MESSAGE PAID',
    ],
  },
  {
    name: 'ACCEPTED → CANCEL by the renter → CANCELLED',
    from: () => given('ACCEPTED'),
    actor: renter,
    event: { type: 'CANCEL', reason: SAMPLE.reason },
    status: 'CANCELLED',
    effects: [
      'CANCEL_TIMER PAYMENT_EXPIRY',
      'RELEASE_DATES',
      'NOTIFY OWNER CANCELLED',
      'SYSTEM_MESSAGE CANCELLED',
    ],
  },
  {
    name: 'ACCEPTED → CANCEL by the owner → CANCELLED',
    from: () => given('ACCEPTED', { renterSigned: true }),
    actor: owner,
    event: { type: 'CANCEL', reason: SAMPLE.reason },
    status: 'CANCELLED',
    effects: [
      'CANCEL_TIMER PAYMENT_EXPIRY',
      'RELEASE_DATES',
      'NOTIFY RENTER CANCELLED',
      'SYSTEM_MESSAGE CANCELLED',
    ],
  },
  {
    name: 'ACCEPTED → TIMEOUT PAYMENT_EXPIRY → EXPIRED',
    from: () => given('ACCEPTED'),
    actor: system,
    event: { type: 'TIMEOUT', timer: 'PAYMENT_EXPIRY' },
    when: (s) => at(s, 'PAYMENT_EXPIRY'),
    status: 'EXPIRED',
    effects: ['RELEASE_DATES', 'NOTIFY RENTER EXPIRED', 'NOTIFY OWNER EXPIRED', 'SYSTEM_MESSAGE EXPIRED'],
  },
  {
    name: 'PAID → MARK_HANDED_OVER by the owner → PAID',
    from: () => given('PAID'),
    actor: owner,
    event: { type: 'MARK_HANDED_OVER' },
    status: 'PAID',
    effects: ['SCHEDULE HANDOVER_CONFIRM', 'NOTIFY RENTER HANDED_OVER', 'SYSTEM_MESSAGE HANDED_OVER'],
  },
  {
    name: 'PAID → CONFIRM_RECEIVED by the renter after "handed over" → ACTIVE',
    from: () => given('PAID', { handedOver: true }),
    actor: renter,
    event: { type: 'CONFIRM_RECEIVED' },
    status: 'ACTIVE',
    effects: [
      'CANCEL_TIMER HANDOVER_CONFIRM',
      'LEDGER RENT_RELEASE',
      'NOTIFY OWNER RECEIVED',
      'SYSTEM_MESSAGE RECEIVED',
    ],
  },
  {
    name: 'PAID → CONFIRM_RECEIVED by the renter on its own → ACTIVE',
    from: () => given('PAID'),
    actor: renter,
    event: { type: 'CONFIRM_RECEIVED' },
    status: 'ACTIVE',
    effects: ['LEDGER RENT_RELEASE', 'NOTIFY OWNER RECEIVED', 'SYSTEM_MESSAGE RECEIVED'],
  },
  {
    name: 'PAID → TIMEOUT HANDOVER_CONFIRM → ACTIVE',
    from: () => given('PAID', { handedOver: true }),
    actor: system,
    event: { type: 'TIMEOUT', timer: 'HANDOVER_CONFIRM' },
    when: (s) => at(s, 'HANDOVER_CONFIRM'),
    status: 'ACTIVE',
    effects: ['LEDGER RENT_RELEASE', 'NOTIFY OWNER RECEIVED', 'SYSTEM_MESSAGE RECEIVED'],
  },
  {
    name: 'PAID → REPORT_NOT_RECEIVED by the renter → DISPUTED (NOT_HANDED_OVER)',
    from: () => given('PAID', { handedOver: true }),
    actor: renter,
    event: { type: 'REPORT_NOT_RECEIVED', note: SAMPLE.note },
    status: 'DISPUTED',
    effects: [
      'CANCEL_TIMER HANDOVER_CONFIRM',
      'NOTIFY ADMINS DISPUTE_OPENED',
      'NOTIFY OWNER DISPUTE_OPENED',
      'SYSTEM_MESSAGE DISPUTE_OPENED',
    ],
  },
  {
    name: 'PAID → CANCEL by the owner before "handed over" → CANCELLED, all refunded',
    from: () => given('PAID'),
    actor: owner,
    event: { type: 'CANCEL', reason: SAMPLE.reason },
    status: 'CANCELLED',
    outcome: 'REFUNDED_ALL',
    effects: [
      'LEDGER BOOKING_REFUND',
      'RELEASE_DATES',
      'NOTIFY RENTER CANCELLED',
      'SYSTEM_MESSAGE CANCELLED',
    ],
  },
  {
    name: 'PAID → CANCEL by the renter before "handed over" → CANCELLED, all refunded',
    from: () => given('PAID'),
    actor: renter,
    event: { type: 'CANCEL', reason: SAMPLE.reason },
    status: 'CANCELLED',
    outcome: 'REFUNDED_ALL',
    effects: ['LEDGER BOOKING_REFUND', 'RELEASE_DATES', 'NOTIFY OWNER CANCELLED', 'SYSTEM_MESSAGE CANCELLED'],
  },
  {
    name: 'ACTIVE → MARK_RETURNED by the renter → ACTIVE',
    from: () => given('ACTIVE'),
    actor: renter,
    event: { type: 'MARK_RETURNED' },
    status: 'ACTIVE',
    effects: ['SCHEDULE RETURN_CONFIRM', 'NOTIFY OWNER RETURNED', 'SYSTEM_MESSAGE RETURNED'],
  },
  {
    name: 'ACTIVE → CONFIRM_RETURNED by the owner after "returned" → RETURNED',
    from: () => given('ACTIVE', { returned: true }),
    actor: owner,
    event: { type: 'CONFIRM_RETURNED' },
    status: 'RETURNED',
    effects: [
      'CANCEL_TIMER RETURN_CONFIRM',
      'SCHEDULE INSPECTION',
      'RELEASE_DATES',
      'NOTIFY RENTER RECEIVED_BACK',
      'SYSTEM_MESSAGE RECEIVED_BACK',
    ],
  },
  {
    name: 'ACTIVE → CONFIRM_RETURNED by the owner on their own → RETURNED',
    from: () => given('ACTIVE'),
    actor: owner,
    event: { type: 'CONFIRM_RETURNED' },
    status: 'RETURNED',
    effects: [
      'SCHEDULE INSPECTION',
      'RELEASE_DATES',
      'NOTIFY RENTER RECEIVED_BACK',
      'SYSTEM_MESSAGE RECEIVED_BACK',
    ],
  },
  {
    name: 'ACTIVE → TIMEOUT RETURN_CONFIRM → RETURNED',
    from: () => given('ACTIVE', { returned: true }),
    actor: system,
    event: { type: 'TIMEOUT', timer: 'RETURN_CONFIRM' },
    when: (s) => at(s, 'RETURN_CONFIRM'),
    status: 'RETURNED',
    effects: [
      'SCHEDULE INSPECTION',
      'RELEASE_DATES',
      'NOTIFY RENTER RECEIVED_BACK',
      'SYSTEM_MESSAGE RECEIVED_BACK',
    ],
  },
  {
    name: 'ACTIVE → REPORT_NOT_RETURNED by the owner after "returned" → DISPUTED (NOT_RETURNED)',
    from: () => given('ACTIVE', { returned: true }),
    actor: owner,
    event: { type: 'REPORT_NOT_RETURNED', note: SAMPLE.note },
    status: 'DISPUTED',
    effects: [
      'CANCEL_TIMER RETURN_CONFIRM',
      'NOTIFY ADMINS DISPUTE_OPENED',
      'NOTIFY RENTER DISPUTE_OPENED',
      'SYSTEM_MESSAGE DISPUTE_OPENED',
    ],
  },
  {
    name: 'ACTIVE → REPORT_NOT_RETURNED by the owner after the rental ended → DISPUTED (NOT_RETURNED)',
    from: () => given('ACTIVE'),
    actor: owner,
    event: { type: 'REPORT_NOT_RETURNED', note: SAMPLE.note },
    when: () => afterRentalEnded,
    status: 'DISPUTED',
    effects: [
      'NOTIFY ADMINS DISPUTE_OPENED',
      'NOTIFY RENTER DISPUTE_OPENED',
      'SYSTEM_MESSAGE DISPUTE_OPENED',
    ],
  },
  {
    name: 'RETURNED → ALL_FINE by the owner → COMPLETED, deposit refunded',
    from: () => given('RETURNED'),
    actor: owner,
    event: { type: 'ALL_FINE' },
    status: 'COMPLETED',
    outcome: 'DEPOSIT_REFUNDED',
    effects: [
      'CANCEL_TIMER INSPECTION',
      'LEDGER DEPOSIT_REFUND',
      'NOTIFY RENTER ALL_FINE',
      'SYSTEM_MESSAGE ALL_FINE',
    ],
  },
  {
    name: 'RETURNED → TIMEOUT INSPECTION → COMPLETED, deposit refunded',
    from: () => given('RETURNED'),
    actor: system,
    event: { type: 'TIMEOUT', timer: 'INSPECTION' },
    when: (s) => at(s, 'INSPECTION'),
    status: 'COMPLETED',
    outcome: 'DEPOSIT_REFUNDED',
    effects: ['LEDGER DEPOSIT_REFUND', 'NOTIFY RENTER ALL_FINE', 'SYSTEM_MESSAGE ALL_FINE'],
  },
  {
    name: 'RETURNED → REPORT_DAMAGE by the owner → DAMAGE_CLAIMED',
    from: () => given('RETURNED'),
    actor: owner,
    event: { type: 'REPORT_DAMAGE', description: SAMPLE.description, photoIds: SAMPLE.photoIds },
    status: 'DAMAGE_CLAIMED',
    effects: [
      'CANCEL_TIMER INSPECTION',
      'SCHEDULE DAMAGE_REPLY',
      'NOTIFY RENTER DAMAGE_REPORTED',
      'SYSTEM_MESSAGE DAMAGE_REPORTED',
    ],
  },
  {
    name: 'DAMAGE_CLAIMED → ACCEPT_DAMAGE by the renter → COMPLETED, deposit to the owner',
    from: () => given('DAMAGE_CLAIMED'),
    actor: renter,
    event: { type: 'ACCEPT_DAMAGE' },
    status: 'COMPLETED',
    outcome: 'DEPOSIT_TO_OWNER',
    effects: [
      'CANCEL_TIMER DAMAGE_REPLY',
      'LEDGER DEPOSIT_TO_OWNER',
      'NOTIFY OWNER DAMAGE_ACCEPTED',
      'SYSTEM_MESSAGE DAMAGE_ACCEPTED',
    ],
  },
  {
    name: 'DAMAGE_CLAIMED → REJECT_DAMAGE by the renter → DISPUTED (DAMAGE)',
    from: () => given('DAMAGE_CLAIMED'),
    actor: renter,
    event: { type: 'REJECT_DAMAGE', note: SAMPLE.note },
    status: 'DISPUTED',
    effects: [
      'CANCEL_TIMER DAMAGE_REPLY',
      'NOTIFY ADMINS DISPUTE_OPENED',
      'NOTIFY OWNER DISPUTE_OPENED',
      'SYSTEM_MESSAGE DISPUTE_OPENED',
    ],
  },
  {
    name: 'DAMAGE_CLAIMED → TIMEOUT DAMAGE_REPLY → DISPUTED (DAMAGE)',
    from: () => given('DAMAGE_CLAIMED'),
    actor: system,
    event: { type: 'TIMEOUT', timer: 'DAMAGE_REPLY' },
    when: (s) => at(s, 'DAMAGE_REPLY'),
    status: 'DISPUTED',
    effects: ['NOTIFY ADMINS DISPUTE_OPENED', 'NOTIFY OWNER DISPUTE_OPENED', 'SYSTEM_MESSAGE DISPUTE_OPENED'],
  },
  {
    name: 'DISPUTED (DAMAGE) → RESOLVE REFUND_DEPOSIT → COMPLETED, deposit refunded',
    from: () => given('DISPUTED', { dispute: 'DAMAGE' }),
    actor: admin,
    event: resolve('REFUND_DEPOSIT'),
    status: 'COMPLETED',
    outcome: 'DEPOSIT_REFUNDED',
    effects: ['LEDGER DEPOSIT_REFUND', ...resolved],
  },
  {
    name: 'DISPUTED (DAMAGE) → RESOLVE DEPOSIT_TO_OWNER → COMPLETED, deposit to the owner',
    from: () => given('DISPUTED', { dispute: 'DAMAGE' }),
    actor: admin,
    event: resolve('DEPOSIT_TO_OWNER'),
    status: 'COMPLETED',
    outcome: 'DEPOSIT_TO_OWNER',
    effects: ['LEDGER DEPOSIT_TO_OWNER', ...resolved],
  },
  {
    name: 'DISPUTED (NOT_RETURNED) → RESOLVE REFUND_DEPOSIT → COMPLETED, dates released',
    from: () => given('DISPUTED', { dispute: 'NOT_RETURNED' }),
    actor: admin,
    event: resolve('REFUND_DEPOSIT'),
    status: 'COMPLETED',
    outcome: 'DEPOSIT_REFUNDED',
    effects: ['LEDGER DEPOSIT_REFUND', 'RELEASE_DATES', ...resolved],
  },
  {
    name: 'DISPUTED (NOT_RETURNED) → RESOLVE DEPOSIT_TO_OWNER → COMPLETED, dates released',
    from: () => given('DISPUTED', { dispute: 'NOT_RETURNED' }),
    actor: admin,
    event: resolve('DEPOSIT_TO_OWNER'),
    status: 'COMPLETED',
    outcome: 'DEPOSIT_TO_OWNER',
    effects: ['LEDGER DEPOSIT_TO_OWNER', 'RELEASE_DATES', ...resolved],
  },
  {
    name: 'DISPUTED (NOT_HANDED_OVER) → RESOLVE REFUND_ALL → CANCELLED by the admin, all refunded',
    from: () => given('DISPUTED', { dispute: 'NOT_HANDED_OVER' }),
    actor: admin,
    event: resolve('REFUND_ALL'),
    status: 'CANCELLED',
    outcome: 'REFUNDED_ALL',
    effects: ['LEDGER BOOKING_REFUND', 'RELEASE_DATES', ...resolved],
  },
  {
    name: 'DISPUTED (NOT_HANDED_OVER) → RESOLVE CONFIRM_HANDOVER → ACTIVE',
    from: () => given('DISPUTED', { dispute: 'NOT_HANDED_OVER' }),
    actor: admin,
    event: resolve('CONFIRM_HANDOVER'),
    status: 'ACTIVE',
    effects: ['LEDGER RENT_RELEASE', ...resolved],
  },
];

describe('the transition table', () => {
  it.each(TABLE)('$name', ({ from, actor, event, when, status, outcome, effects }) => {
    const s = from();
    const d = decide(s, actor, event, when ? when(s) : ctx);
    expect(d.next.status).toBe(status);
    expect(d.next.outcome).toBe(outcome);
    expect(d.effects.map(describeEffect)).toEqual(effects);
  });
});

describe('what each transition records', () => {
  it('accepting arms the payment deadline, capped at the end of the first rental day', () => {
    expect(step(given('REQUESTED'), owner, { type: 'ACCEPT' }).timers).toEqual({
      PAYMENT_EXPIRY: hoursAfterNow(24),
    });

    const startDayEvening: DecideContext = { ...ctx, now: new Date('2026-11-10T19:00:00Z') }; // 21:00 in Riga
    const requested = createRequest(requestInput(), startDayEvening).next;
    const accepted = step(requested, owner, { type: 'ACCEPT' }, later(startDayEvening, 2));
    expect(accepted.timers).toEqual({ PAYMENT_EXPIRY: endOfDayIn(localDate('2026-11-10'), 'Europe/Riga') });
  });

  it('signing records who signed and when', () => {
    const renterSigned = step(given('ACCEPTED'), renter, { type: 'SIGN' }, later(ctx, 1));
    expect(renterSigned.renterSignedAt).toEqual(hoursAfterNow(1));
    expect(renterSigned.ownerSignedAt).toBeUndefined();
    const bothSigned = step(renterSigned, owner, { type: 'SIGN' }, later(ctx, 2));
    expect(bothSigned.ownerSignedAt).toEqual(hoursAfterNow(2));
  });

  it('paying records the method', () => {
    expect(given('PAID', { method: 'WALLET' }).paymentMethod).toBe('WALLET');
    expect(given('PAID', { method: 'CARD' }).paymentMethod).toBe('CARD');
  });

  it('the handover and return marks start their confirmation windows', () => {
    const handed = step(given('PAID'), owner, { type: 'MARK_HANDED_OVER' }, later(ctx, 1));
    expect(handed.ownerHandedOverAt).toEqual(hoursAfterNow(1));
    expect(handed.timers).toEqual({ HANDOVER_CONFIRM: hoursAfterNow(1 + 48) });

    const received = step(handed, renter, { type: 'CONFIRM_RECEIVED' }, later(ctx, 2));
    expect(received.renterReceivedAt).toEqual(hoursAfterNow(2));
    expect(received.timers).toEqual({});

    const returned = step(received, renter, { type: 'MARK_RETURNED' }, later(ctx, 3));
    expect(returned.renterReturnedAt).toEqual(hoursAfterNow(3));
    expect(returned.timers).toEqual({ RETURN_CONFIRM: hoursAfterNow(3 + 48) });

    const back = step(returned, owner, { type: 'CONFIRM_RETURNED' }, later(ctx, 4));
    expect(back.ownerReceivedBackAt).toEqual(hoursAfterNow(4));
    expect(back.timers).toEqual({ INSPECTION: hoursAfterNow(4 + 48) });
  });

  it('a damage claim keeps its description and photos and gives the renter 48 hours to answer', () => {
    const claimed = given('DAMAGE_CLAIMED');
    expect(claimed.damage).toEqual({
      description: SAMPLE.description,
      photoIds: SAMPLE.photoIds,
      claimedAt: NOW,
    });
    expect(claimed.timers).toEqual({ DAMAGE_REPLY: hoursAfterNow(48) });
  });

  it('cancellations keep who cancelled, why and when', () => {
    expect(step(given('ACCEPTED'), owner, { type: 'CANCEL', reason: SAMPLE.reason }).cancellation).toEqual({
      by: 'OWNER',
      reason: SAMPLE.reason,
      at: NOW,
    });
    expect(step(given('REQUESTED'), renter, { type: 'WITHDRAW' }).cancellation).toEqual({
      by: 'RENTER',
      at: NOW,
    });
  });

  it('a decline keeps its reason when the owner gives one', () => {
    expect(step(given('REQUESTED'), owner, { type: 'DECLINE', reason: 'Busy that week' }).declineReason).toBe(
      'Busy that week',
    );
    expect(step(given('REQUESTED'), owner, { type: 'DECLINE' }).declineReason).toBeUndefined();
  });

  it('disputes keep their reason, when they opened and the note', () => {
    expect(given('DISPUTED', { dispute: 'NOT_HANDED_OVER' }).dispute).toEqual({
      reason: 'NOT_HANDED_OVER',
      openedAt: NOW,
      note: SAMPLE.note,
    });
    expect(given('DISPUTED', { dispute: 'NOT_RETURNED' }).dispute).toEqual({
      reason: 'NOT_RETURNED',
      openedAt: NOW,
      note: SAMPLE.note,
    });
    const timedOut = given('DAMAGE_CLAIMED');
    expect(
      step(timedOut, system, { type: 'TIMEOUT', timer: 'DAMAGE_REPLY' }, at(timedOut, 'DAMAGE_REPLY'))
        .dispute,
    ).toEqual({
      reason: 'DAMAGE',
      openedAt: hoursAfterNow(48),
    });
  });

  it('a resolution keeps the admin, the decision and the comment', () => {
    const decided = step(given('DISPUTED'), admin, resolve('DEPOSIT_TO_OWNER'));
    expect(decided.dispute).toEqual({
      reason: 'DAMAGE',
      openedAt: NOW,
      note: SAMPLE.note,
      resolution: { decision: 'DEPOSIT_TO_OWNER', comment: SAMPLE.comment, by: 'admin-1', at: NOW },
    });
    const refunded = step(given('DISPUTED', { dispute: 'NOT_HANDED_OVER' }), admin, resolve('REFUND_ALL'));
    expect(refunded.cancellation).toEqual({ by: 'ADMIN', reason: SAMPLE.comment, at: NOW });
  });

  it('a completed deal records when it closed and has no timers left', () => {
    const done = step(given('RETURNED'), owner, { type: 'ALL_FINE' }, later(ctx, 2));
    expect(done.completedAt).toEqual(hoursAfterNow(2));
    expect(done.updatedAt).toEqual(hoursAfterNow(2));
    expect(done.timers).toEqual({});
    expect(given('CANCELLED').completedAt).toBeUndefined();
  });

  it('returns a new snapshot and leaves the given one untouched', () => {
    const s = given('PAID');
    const copy = structuredClone(s);
    const d = decide(s, owner, { type: 'MARK_HANDED_OVER' }, later(ctx, 1));
    expect(s).toEqual(copy);
    expect(d.next).not.toBe(s);
    expect(d.next.timers).not.toBe(s.timers);
    expect(d.next.updatedAt).toEqual(hoursAfterNow(1));
    expect(d.next.createdAt).toEqual(NOW);
  });
});

describe('money in the transitions', () => {
  const ids = { bookingId: 'booking-1', renterId: RENTER_ID, ownerId: OWNER_ID };

  it('a payment moves the whole quote through the ledger', () => {
    const s = given('ACCEPTED', { renterSigned: true, ownerSigned: true });
    const d = decide(s, renter, { type: 'PAY', method: 'WALLET' }, ctx);
    expect(ledgerOf(d)).toEqual([bookingPayment({ ...ids, quote: s.quote, method: 'WALLET' })]);
  });

  it('a confirmed handover releases the rent to the owner', () => {
    const s = given('PAID');
    expect(ledgerOf(decide(s, renter, { type: 'CONFIRM_RECEIVED' }, ctx))).toEqual([
      rentRelease({ ...ids, rentCents: s.quote.rentCents }),
    ]);
  });

  it('refunds and the deposit go back the way the renter paid', () => {
    const byCard = given('PAID', { method: 'CARD' });
    expect(ledgerOf(decide(byCard, owner, { type: 'CANCEL', reason: SAMPLE.reason }, ctx))).toEqual([
      bookingRefund({ ...ids, quote: byCard.quote, method: 'CARD' }),
    ]);
    const returnedByWallet = given('RETURNED', { method: 'WALLET' });
    expect(ledgerOf(decide(returnedByWallet, owner, { type: 'ALL_FINE' }, ctx))).toEqual([
      depositRefund({ ...ids, depositCents: returnedByWallet.quote.depositCents, method: 'WALLET' }),
    ]);
    const returnedByCard = given('RETURNED', { method: 'CARD' });
    expect(ledgerOf(decide(returnedByCard, owner, { type: 'ALL_FINE' }, ctx))[0]?.postings).toContainEqual({
      account: 'external:card',
      amount: 10000,
    });
  });

  it('with no deposit the transitions are the same but move no deposit money', () => {
    const free = { depositCents: 0 };
    const paid = decide(
      given('ACCEPTED', { renterSigned: true, ownerSigned: true, ...free }),
      renter,
      {
        type: 'PAY',
        method: 'CARD',
      },
      ctx,
    );
    expect(ledgerOf(paid)[0]?.postings.map((p) => p.account)).toEqual([
      'external:card',
      'escrow:booking-1',
      'platform:revenue',
    ]);

    const allFine = decide(given('RETURNED', free), owner, { type: 'ALL_FINE' }, ctx);
    expect(allFine.next).toMatchObject({ status: 'COMPLETED', outcome: 'DEPOSIT_REFUNDED' });
    expect(ledgerOf(allFine)).toEqual([]);

    const accepted = decide(given('DAMAGE_CLAIMED', free), renter, { type: 'ACCEPT_DAMAGE' }, ctx);
    expect(accepted.next).toMatchObject({ status: 'COMPLETED', outcome: 'DEPOSIT_TO_OWNER' });
    expect(ledgerOf(accepted)).toEqual([]);
  });
});

describe('conditions of a transition', () => {
  it('accepting needs the dates to be free', () => {
    const taken = { ...ctx, blocked: [period(localDate('2026-11-12'), localDate('2026-11-15'))] };
    expect(() => decide(given('REQUESTED'), owner, { type: 'ACCEPT' }, taken)).toThrow(
      code('DATES_UNAVAILABLE'),
    );
  });

  it('accepting needs to be told which dates are taken', () => {
    const { blocked: _blocked, ...noCalendar } = ctx;
    expect(() => decide(given('REQUESTED'), owner, { type: 'ACCEPT' }, noCalendar)).toThrow(
      code('INVALID_INPUT'),
    );
  });

  it('paying needs both signatures: the contract comes first', () => {
    for (const signatures of [{}, { renterSigned: true }, { ownerSigned: true }]) {
      expect(() =>
        decide(given('ACCEPTED', signatures), renter, { type: 'PAY', method: 'CARD' }, ctx),
      ).toThrow(code('CONTRACT_NOT_SIGNED'));
    }
  });

  it('a wallet payment needs enough money in the wallet, and to be told how much there is', () => {
    const signed = given('ACCEPTED', { renterSigned: true, ownerSigned: true });
    const pay: BookingEvent = { type: 'PAY', method: 'WALLET' };
    expect(() => decide(signed, renter, pay, { ...ctx, walletAvailableCents: cents(14949) })).toThrow(
      expect.objectContaining({
        code: 'INSUFFICIENT_FUNDS',
        details: { availableCents: 14949, neededCents: 14950, shortfallCents: 1 },
      }),
    );
    expect(decide(signed, renter, pay, { ...ctx, walletAvailableCents: cents(14950) }).next.status).toBe(
      'PAID',
    );
    const { walletAvailableCents: _wallet, ...noWallet } = ctx;
    expect(() => decide(signed, renter, pay, noWallet)).toThrow(code('INVALID_INPUT'));
    expect(decide(signed, renter, { type: 'PAY', method: 'CARD' }, noWallet).next.status).toBe('PAID');
  });

  it('refuses an unknown payment method', () => {
    const signed = given('ACCEPTED', { renterSigned: true, ownerSigned: true });
    expect(() => decide(signed, renter, { type: 'PAY', method: 'CASH' as 'CARD' }, ctx)).toThrow(
      code('INVALID_INPUT'),
    );
  });

  it('the handover and the return can each be marked once', () => {
    const handed = step(given('PAID'), owner, { type: 'MARK_HANDED_OVER' });
    expect(() => decide(handed, owner, { type: 'MARK_HANDED_OVER' }, ctx)).toThrow(
      code('TRANSITION_NOT_ALLOWED'),
    );
    const returned = step(given('ACTIVE'), renter, { type: 'MARK_RETURNED' });
    expect(() => decide(returned, renter, { type: 'MARK_RETURNED' }, ctx)).toThrow(
      code('TRANSITION_NOT_ALLOWED'),
    );
  });

  it('"not received" needs the owner to have marked "handed over"', () => {
    expect(() =>
      decide(given('PAID'), renter, { type: 'REPORT_NOT_RECEIVED', note: SAMPLE.note }, ctx),
    ).toThrow(code('TRANSITION_NOT_ALLOWED'));
  });

  it('once the owner marked "handed over", nobody can cancel: only "received" or "not received" remain (Review Focus 3)', () => {
    const paid = given('PAID');
    const handed = decide(paid, owner, { type: 'MARK_HANDED_OVER' }, ctx).next;
    expect(() => decide(handed, renter, { type: 'CANCEL', reason: 'changed my mind' }, ctx)).toThrow(
      code('TRANSITION_NOT_ALLOWED'),
    );
    expect(() => decide(handed, owner, { type: 'CANCEL', reason: 'changed my mind' }, ctx)).toThrow(
      code('TRANSITION_NOT_ALLOWED'),
    );
    expect(decide(handed, renter, { type: 'CONFIRM_RECEIVED' }, ctx).next.status).toBe('ACTIVE');
    expect(decide(handed, renter, { type: 'REPORT_NOT_RECEIVED', note: SAMPLE.note }, ctx).next.status).toBe(
      'DISPUTED',
    );
  });

  it('"not returned" needs the renter’s "returned" or the rental to be over', () => {
    const active = given('ACTIVE');
    const report: BookingEvent = { type: 'REPORT_NOT_RETURNED', note: SAMPLE.note };
    expect(() => decide(active, owner, report, ctx)).toThrow(code('TRANSITION_NOT_ALLOWED'));
    const lastDayEvening = { ...ctx, now: new Date('2026-11-12T21:30:00Z') }; // 23:30 on 12 Nov in Riga
    expect(() => decide(active, owner, report, lastDayEvening)).toThrow(code('TRANSITION_NOT_ALLOWED'));
    expect(decide(active, owner, report, afterRentalEnded).next.status).toBe('DISPUTED');
  });

  it('checks what people write', () => {
    const accepted = given('ACCEPTED');
    for (const reason of ['', '   ', 'x'.repeat(2001)]) {
      expect(() => decide(accepted, renter, { type: 'CANCEL', reason }, ctx)).toThrow(code('INVALID_INPUT'));
    }
    expect(decide(accepted, renter, { type: 'CANCEL', reason: 'x'.repeat(2000) }, ctx).next.status).toBe(
      'CANCELLED',
    );
    expect(() => decide(given('REQUESTED'), owner, { type: 'DECLINE', reason: ' ' }, ctx)).toThrow(
      code('INVALID_INPUT'),
    );
    expect(() => decide(given('DAMAGE_CLAIMED'), renter, { type: 'REJECT_DAMAGE', note: '' }, ctx)).toThrow(
      code('INVALID_INPUT'),
    );
    expect(() =>
      decide(given('DISPUTED'), admin, { type: 'RESOLVE', decision: 'REFUND_DEPOSIT', comment: '' }, ctx),
    ).toThrow(code('INVALID_INPUT'));
    expect(() =>
      decide(
        given('DISPUTED'),
        admin,
        { type: 'RESOLVE', decision: 'REFUND_DEPOSIT', comment: 'x'.repeat(2001) },
        ctx,
      ),
    ).toThrow(code('INVALID_INPUT'));
  });

  it('a damage claim needs a description of 10–2000 characters and 1–8 distinct photos', () => {
    const returned = given('RETURNED');
    const claim = (description: string, photoIds: readonly string[]) => () =>
      decide(returned, owner, { type: 'REPORT_DAMAGE', description, photoIds }, ctx);
    expect(claim('Scratched', ['p1'])).toThrow(code('INVALID_INPUT'));
    expect(claim('  Scratched  ', ['p1'])).toThrow(code('INVALID_INPUT'));
    expect(claim('x'.repeat(2001), ['p1'])).toThrow(code('INVALID_INPUT'));
    expect(claim('Scratched!', [])).toThrow(code('INVALID_INPUT'));
    expect(claim('Scratched!', ['1', '2', '3', '4', '5', '6', '7', '8', '9'])).toThrow(code('INVALID_INPUT'));
    expect(claim('Scratched!', [''])).toThrow(code('INVALID_INPUT'));
    expect(claim('Scratched!', ['p1', 'p1'])).toThrow(code('INVALID_INPUT'));
    expect(claim('Scratched!', ['1', '2', '3', '4', '5', '6', '7', '8'])().next.status).toBe(
      'DAMAGE_CLAIMED',
    );
  });

  it('a resolution has to fit the dispute', () => {
    expect(() => decide(given('DISPUTED'), admin, resolve('REFUND_ALL'), ctx)).toThrow(
      code('TRANSITION_NOT_ALLOWED'),
    );
    expect(() => decide(given('DISPUTED'), admin, resolve('CONFIRM_HANDOVER'), ctx)).toThrow(
      code('TRANSITION_NOT_ALLOWED'),
    );
    const notHandedOver = given('DISPUTED', { dispute: 'NOT_HANDED_OVER' });
    expect(() => decide(notHandedOver, admin, resolve('REFUND_DEPOSIT'), ctx)).toThrow(
      code('TRANSITION_NOT_ALLOWED'),
    );
    expect(() => decide(notHandedOver, admin, resolve('DEPOSIT_TO_OWNER'), ctx)).toThrow(
      code('TRANSITION_NOT_ALLOWED'),
    );
  });

  it('signing again changes nothing and says nothing', () => {
    const signed = step(given('ACCEPTED'), renter, { type: 'SIGN' });
    const again = decide(signed, renter, { type: 'SIGN' }, later(ctx, 1));
    expect(again).toEqual({ next: signed, effects: [] });
    expect(again.next).toBe(signed);
  });
});

describe('who may act', () => {
  it('refuses anyone who is not a party to the booking', () => {
    expect(() => decide(given('REQUESTED'), stranger, { type: 'ACCEPT' }, ctx)).toThrow(code('NOT_A_PARTY'));
    expect(() =>
      decide(given('REQUESTED'), { kind: 'RENTER', userId: OWNER_ID }, { type: 'WITHDRAW' }, ctx),
    ).toThrow(code('NOT_A_PARTY'));
  });

  it('lets an admin only resolve disputes, and the system only fire timers', () => {
    expect(() => decide(given('REQUESTED'), admin, { type: 'ACCEPT' }, ctx)).toThrow(code('NOT_A_PARTY'));
    expect(() => decide(given('RETURNED'), system, { type: 'ALL_FINE' }, ctx)).toThrow(code('NOT_A_PARTY'));
  });

  it('keeps each side to its own actions', () => {
    expect(() => decide(given('REQUESTED'), renter, { type: 'ACCEPT' }, ctx)).toThrow(
      code('TRANSITION_NOT_ALLOWED'),
    );
    expect(() =>
      decide(
        given('ACCEPTED', { renterSigned: true, ownerSigned: true }),
        owner,
        { type: 'PAY', method: 'CARD' },
        ctx,
      ),
    ).toThrow(code('TRANSITION_NOT_ALLOWED'));
    const returned = given('RETURNED');
    expect(() =>
      decide(returned, owner, { type: 'TIMEOUT', timer: 'INSPECTION' }, at(returned, 'INSPECTION')),
    ).toThrow(code('TRANSITION_NOT_ALLOWED'));
  });
});

describe('timers (Review Focus 2)', () => {
  const inspection: BookingEvent = { type: 'TIMEOUT', timer: 'INSPECTION' };

  it('refuses a clock that is not a real moment instead of treating every deadline as due', () => {
    const noClock = { ...ctx, now: new Date(Number.NaN) };
    expect(() => decide(given('RETURNED'), system, inspection, noClock)).toThrow(code('INVALID_INPUT'));
    expect(() => decide(given('RETURNED'), owner, { type: 'ALL_FINE' }, noClock)).toThrow(
      code('INVALID_INPUT'),
    );
  });

  it('a timer that fires after the booking moved on changes nothing', () => {
    const done = decide(given('RETURNED'), owner, { type: 'ALL_FINE' }, ctx);
    const late = decide(done.next, system, inspection, later(ctx, 49));
    expect(late).toEqual({ next: done.next, effects: [] });
    expect(late.next).toBe(done.next);
  });

  it('a timer that fires before its time changes nothing', () => {
    const returned = given('RETURNED');
    const early = decide(returned, system, inspection, later(ctx, 47));
    expect(early.effects).toEqual([]);
    expect(early.next).toBe(returned);
  });

  it('a timer that fires twice acts once', () => {
    const returned = given('RETURNED');
    const first = decide(returned, system, inspection, at(returned, 'INSPECTION'));
    expect(first.next.status).toBe('COMPLETED');
    const second = decide(first.next, system, inspection, later(at(returned, 'INSPECTION'), 1));
    expect(second).toEqual({ next: first.next, effects: [] });
  });

  it('a timer the booking never armed changes nothing', () => {
    const paid = given('PAID');
    expect(decide(paid, system, { type: 'TIMEOUT', timer: 'HANDOVER_CONFIRM' }, later(ctx, 100)).next).toBe(
      paid,
    );
    expect(decide(paid, system, { type: 'TIMEOUT', timer: 'REQUEST_EXPIRY' }, later(ctx, 100)).next).toBe(
      paid,
    );
  });

  it('once a deadline has passed, only its timer may act on the booking', () => {
    const returned = given('RETURNED');
    const damage: BookingEvent = {
      type: 'REPORT_DAMAGE',
      description: SAMPLE.description,
      photoIds: SAMPLE.photoIds,
    };
    expect(decide(returned, owner, damage, later(ctx, 47)).next.status).toBe('DAMAGE_CLAIMED');
    expect(() => decide(returned, owner, damage, at(returned, 'INSPECTION'))).toThrow(
      expect.objectContaining({
        code: 'TRANSITION_NOT_ALLOWED',
        details: expect.objectContaining({ overdueTimer: 'INSPECTION' }),
      }),
    );

    const requested = given('REQUESTED');
    expect(() => decide(requested, owner, { type: 'ACCEPT' }, at(requested, 'REQUEST_EXPIRY'))).toThrow(
      code('TRANSITION_NOT_ALLOWED'),
    );
    const signed = given('ACCEPTED', { renterSigned: true, ownerSigned: true });
    expect(() =>
      decide(signed, renter, { type: 'PAY', method: 'CARD' }, at(signed, 'PAYMENT_EXPIRY')),
    ).toThrow(code('TRANSITION_NOT_ALLOWED'));
  });
});

/** Who may send which event in which status, per the plan's table. Everything else is refused. */
const ALLOWED: Record<BookingStatus, Partial<Record<ActorKind, readonly BookingEventType[]>>> = {
  REQUESTED: { OWNER: ['ACCEPT', 'DECLINE'], RENTER: ['WITHDRAW'], SYSTEM: ['TIMEOUT'] },
  ACCEPTED: { RENTER: ['SIGN', 'PAY', 'CANCEL'], OWNER: ['SIGN', 'CANCEL'], SYSTEM: ['TIMEOUT'] },
  PAID: {
    OWNER: ['MARK_HANDED_OVER', 'CANCEL'],
    RENTER: ['CONFIRM_RECEIVED', 'REPORT_NOT_RECEIVED', 'CANCEL'],
    SYSTEM: ['TIMEOUT'],
  },
  ACTIVE: {
    RENTER: ['MARK_RETURNED'],
    OWNER: ['CONFIRM_RETURNED', 'REPORT_NOT_RETURNED'],
    SYSTEM: ['TIMEOUT'],
  },
  RETURNED: { OWNER: ['ALL_FINE', 'REPORT_DAMAGE'], SYSTEM: ['TIMEOUT'] },
  DAMAGE_CLAIMED: { RENTER: ['ACCEPT_DAMAGE', 'REJECT_DAMAGE'], SYSTEM: ['TIMEOUT'] },
  DISPUTED: { ADMIN: ['RESOLVE'] },
  COMPLETED: {},
  DECLINED: {},
  EXPIRED: {},
  CANCELLED: {},
};

const SNAPSHOTS: ReadonlyArray<readonly [string, () => BookingSnapshot]> = [
  ...BOOKING_STATUSES.filter((status) => status !== 'DISPUTED').map(
    (status) => [status, () => given(status)] as const,
  ),
  ['DISPUTED (DAMAGE)', () => given('DISPUTED', { dispute: 'DAMAGE' })],
  ['DISPUTED (NOT_RETURNED)', () => given('DISPUTED', { dispute: 'NOT_RETURNED' })],
  ['DISPUTED (NOT_HANDED_OVER)', () => given('DISPUTED', { dispute: 'NOT_HANDED_OVER' })],
];

describe('everything the table does not list is refused', () => {
  it('every allowed transition has its own row test above', () => {
    const covered = new Set(TABLE.map((row) => `${row.from().status} ${row.actor.kind} ${row.event.type}`));
    const allowed = Object.entries(ALLOWED).flatMap(([status, byActor]) =>
      Object.entries(byActor).flatMap(([kind, types]) => types.map((type) => `${status} ${kind} ${type}`)),
    );
    expect(allowed.filter((line) => !covered.has(line))).toEqual([]);
  });

  it.each(SNAPSHOTS)('%s', (_name, build) => {
    const s = build();
    const unexpected: string[] = [];
    for (const actor of [renter, owner, admin, system]) {
      for (const event of SAMPLE_EVENTS) {
        if (event.type !== 'TIMEOUT' && (ALLOWED[s.status][actor.kind] ?? []).includes(event.type)) continue;
        const label = `${actor.kind} ${event.type}${event.type === 'TIMEOUT' ? ` ${event.timer}` : ''}`;
        // Nothing is due at ctx.now, so the system's timers are stale: no change, no error.
        const expected =
          actor.kind === 'SYSTEM' && event.type === 'TIMEOUT'
            ? 'no change'
            : (actor.kind === 'ADMIN' && event.type !== 'RESOLVE') ||
                (actor.kind === 'SYSTEM' && event.type !== 'TIMEOUT')
              ? 'NOT_A_PARTY'
              : 'TRANSITION_NOT_ALLOWED';
        let got: string;
        try {
          const d = decide(s, actor, event, ctx);
          got = d.next === s && d.effects.length === 0 ? 'no change' : `moved to ${d.next.status}`;
        } catch (error) {
          got = error instanceof DomainError ? error.code : String(error);
        }
        if (got !== expected) unexpected.push(`${label}: expected ${expected}, got ${got}`);
      }
    }
    expect(unexpected).toEqual([]);
  });
});

describe('settings and stored deadlines that are not real values (F1)', () => {
  const FIELDS = Object.keys(ctx.settings) as (keyof DecideContext['settings'])[];
  const broken = (field: string): ReadonlyArray<readonly [string, DecideContext]> => {
    const { [field as keyof DecideContext['settings']]: _dropped, ...missing } = ctx.settings;
    return [
      ['missing', { ...ctx, settings: missing as DecideContext['settings'] }],
      ['NaN', { ...ctx, settings: { ...ctx.settings, [field]: Number.NaN } }],
    ];
  };

  it.each(FIELDS)('refuses a missing or NaN %s before anything happens', (field) => {
    for (const [, c] of broken(field)) {
      expect(() => createRequest(requestInput(), c)).toThrow(code('INVALID_INPUT'));
      expect(() => availableActions(given('RETURNED'), owner, c)).toThrow(code('INVALID_INPUT'));
      // A due timer would otherwise fire and move money.
      const returned = given('RETURNED');
      expect(() =>
        decide(
          returned,
          system,
          { type: 'TIMEOUT', timer: 'INSPECTION' },
          { ...at(returned, 'INSPECTION'), settings: c.settings },
        ),
      ).toThrow(code('INVALID_INPUT'));
      expect(() => decide(returned, owner, { type: 'ALL_FINE' }, c)).toThrow(code('INVALID_INPUT'));
    }
  });

  it('a NaN deadline setting cannot arm a timer that fires at once', () => {
    const requested = given('REQUESTED');
    const noTtl = { ...ctx, settings: { ...ctx.settings, paymentTtlHours: Number.NaN } };
    expect(() => decide(requested, owner, { type: 'ACCEPT' }, noTtl)).toThrow(code('INVALID_INPUT'));
  });

  it('refuses to schedule a deadline that is not a real date', () => {
    // Finite and positive, but past the last date a Date can hold.
    const farAway = { ...ctx, settings: { ...ctx.settings, returnConfirmHours: 1e300 } };
    expect(() => decide(given('ACTIVE'), renter, { type: 'MARK_RETURNED' }, farAway)).toThrow(
      code('INVALID_INPUT'),
    );
  });

  it('refuses a stored timer whose date is not a real moment instead of firing it', () => {
    const returned = given('RETURNED');
    const corrupt: BookingSnapshot = { ...returned, timers: { INSPECTION: new Date(Number.NaN) } };
    const later49 = later(ctx, 49);
    expect(() => decide(corrupt, system, { type: 'TIMEOUT', timer: 'INSPECTION' }, later49)).toThrow(
      code('INVALID_INPUT'),
    );
    expect(() => decide(corrupt, owner, { type: 'ALL_FINE' }, ctx)).toThrow(code('INVALID_INPUT'));
    expect(() =>
      decide(
        corrupt,
        owner,
        { type: 'REPORT_DAMAGE', description: SAMPLE.description, photoIds: SAMPLE.photoIds },
        ctx,
      ),
    ).toThrow(code('INVALID_INPUT'));
    expect(() => availableActions(corrupt, owner, ctx)).toThrow(code('INVALID_INPUT'));
    expect(() => availableActions(corrupt, system, later49)).toThrow(code('INVALID_INPUT'));
  });
});
