/**
 * Test-only builders for booking tests. Not exported from the package: snapshots here are reached
 * through the real transitions (createRequest → ACCEPT → SIGN × 2 → PAY → …), never written by hand.
 */
import { localDate, period } from '../dates';
import type { PaymentMethod } from '../ledger';
import { cents } from '../money';
import type { ListingPricing } from '../pricing';
import { DEFAULT_BOOKING_SETTINGS } from '../settings';
import { decide } from './decide';
import { createRequest } from './request';
import type { RequestInput } from './request';
import type {
  Actor,
  BookingEvent,
  BookingSnapshot,
  BookingStatus,
  DecideContext,
  DisputeReason,
  TimerKind,
} from './types';

export const RENTER_ID = 'renter-1';
export const OWNER_ID = 'owner-1';

export const renter: Actor = { kind: 'RENTER', userId: RENTER_ID };
export const owner: Actor = { kind: 'OWNER', userId: OWNER_ID };
export const admin: Actor = { kind: 'ADMIN', userId: 'admin-1' };
export const system: Actor = { kind: 'SYSTEM' };
export const stranger: Actor = { kind: 'OWNER', userId: 'someone-else' };

/** 4 Nov 2026, 12:00 in Riga. */
export const NOW = new Date('2026-11-04T10:00:00Z');

export const HOUR_MS = 3_600_000;

export const ctx: DecideContext = {
  now: NOW,
  settings: DEFAULT_BOOKING_SETTINGS,
  blocked: [],
  walletAvailableCents: cents(1_000_000),
};

/** The same context, `hours` later. */
export function later(c: DecideContext, hours: number): DecideContext {
  return { ...c, now: new Date(c.now.getTime() + hours * HOUR_MS) };
}

/** The context at the moment an armed timer comes due. */
export function at(s: BookingSnapshot, timer: TimerKind, c: DecideContext = ctx): DecideContext {
  const due = s.timers[timer];
  if (due === undefined) throw new Error(`${timer} is not armed in ${s.status}`);
  return { ...c, now: due };
}

/** 15 €/day, 20 % off from 7 days, 100 € deposit. */
export const pricing: ListingPricing = {
  dailyCents: cents(1500),
  weeklyDiscountPercent: 20,
  depositCents: cents(10000),
  minDays: 1,
  maxDays: 30,
};

/** A request for 10–12 Nov 2026 (3 days: rent 45 €, fee 4.50 €, deposit 100 €, total 149.50 €). */
export function requestInput(overrides: Partial<RequestInput> = {}): RequestInput {
  return {
    id: 'booking-1',
    listingId: 'listing-1',
    renterId: RENTER_ID,
    ownerId: OWNER_ID,
    period: period(localDate('2026-11-10'), localDate('2026-11-12')),
    timeZone: 'Europe/Riga',
    pricing,
    blocked: [],
    ...overrides,
  };
}

export function step(
  s: BookingSnapshot,
  actor: Actor,
  event: BookingEvent,
  c: DecideContext = ctx,
): BookingSnapshot {
  return decide(s, actor, event, c).next;
}

export interface GivenOptions {
  /** ACCEPTED only: who has signed so far (nobody by default). */
  readonly renterSigned?: boolean;
  readonly ownerSigned?: boolean;
  readonly method?: PaymentMethod;
  /** PAID or ACTIVE: the owner marked "handed over". */
  readonly handedOver?: boolean;
  /** ACTIVE: the renter marked "returned". */
  readonly returned?: boolean;
  /** DISPUTED: what the dispute is about (DAMAGE by default). */
  readonly dispute?: DisputeReason;
  readonly depositCents?: number;
}

export const SAMPLE = {
  reason: 'Plans changed',
  note: 'We never met at the agreed place',
  description: 'The lens has a deep scratch',
  photoIds: ['photo-1'],
  comment: 'Photos before and after show the scratch',
} as const;

/** A snapshot in `status`, reached through the real transitions at `c.now`. */
export function given(
  status: BookingStatus,
  options: GivenOptions = {},
  c: DecideContext = ctx,
): BookingSnapshot {
  const input =
    options.depositCents === undefined
      ? requestInput()
      : requestInput({ pricing: { ...pricing, depositCents: cents(options.depositCents) } });
  let s = createRequest(input, c).next;
  if (status === 'REQUESTED') return s;
  if (status === 'DECLINED') return step(s, owner, { type: 'DECLINE' }, c);
  if (status === 'EXPIRED')
    return step(s, system, { type: 'TIMEOUT', timer: 'REQUEST_EXPIRY' }, at(s, 'REQUEST_EXPIRY', c));
  if (status === 'CANCELLED') return step(s, renter, { type: 'WITHDRAW' }, c);

  s = step(s, owner, { type: 'ACCEPT' }, c);
  if (status === 'ACCEPTED') {
    if (options.renterSigned) s = step(s, renter, { type: 'SIGN' }, c);
    if (options.ownerSigned) s = step(s, owner, { type: 'SIGN' }, c);
    return s;
  }
  s = step(s, renter, { type: 'SIGN' }, c);
  s = step(s, owner, { type: 'SIGN' }, c);
  s = step(s, renter, { type: 'PAY', method: options.method ?? 'CARD' }, c);
  const disputeReason = options.dispute ?? 'DAMAGE';
  if (status === 'PAID' || (status === 'DISPUTED' && disputeReason === 'NOT_HANDED_OVER')) {
    if (options.handedOver || status === 'DISPUTED') s = step(s, owner, { type: 'MARK_HANDED_OVER' }, c);
    if (status === 'PAID') return s;
    return step(s, renter, { type: 'REPORT_NOT_RECEIVED', note: SAMPLE.note }, c);
  }

  if (options.handedOver) s = step(s, owner, { type: 'MARK_HANDED_OVER' }, c);
  s = step(s, renter, { type: 'CONFIRM_RECEIVED' }, c);
  if (status === 'ACTIVE' || (status === 'DISPUTED' && disputeReason === 'NOT_RETURNED')) {
    if (options.returned || status === 'DISPUTED') s = step(s, renter, { type: 'MARK_RETURNED' }, c);
    if (status === 'ACTIVE') return s;
    return step(s, owner, { type: 'REPORT_NOT_RETURNED', note: SAMPLE.note }, c);
  }

  s = step(s, renter, { type: 'MARK_RETURNED' }, c);
  s = step(s, owner, { type: 'CONFIRM_RETURNED' }, c);
  if (status === 'RETURNED') return s;
  if (status === 'COMPLETED') return step(s, owner, { type: 'ALL_FINE' }, c);

  s = step(
    s,
    owner,
    { type: 'REPORT_DAMAGE', description: SAMPLE.description, photoIds: SAMPLE.photoIds },
    c,
  );
  if (status === 'DAMAGE_CLAIMED') return s;
  return step(s, renter, { type: 'REJECT_DAMAGE', note: SAMPLE.note }, c);
}
