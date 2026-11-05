import {
  cents,
  createRequest,
  decide,
  DEFAULT_BOOKING_SETTINGS,
  localDate,
  period,
  type Actor,
  type BookingEvent,
  type BookingSnapshot,
} from '@yoyo/domain';
import { describe, expect, it } from 'vitest';
import type { Booking } from '../generated/prisma/client';
import { snapshotData, toSnapshot } from './booking.store';

const now0 = new Date('2027-03-01T08:00:00Z');
const hours = (h: number) => new Date(now0.getTime() + h * 3_600_000);
const renter: Actor = { kind: 'RENTER', userId: 'renter' };
const owner: Actor = { kind: 'OWNER', userId: 'owner' };
const admin: Actor = { kind: 'ADMIN', userId: 'admin' };
const ctx = (now: Date, extra: object = {}) => ({ now, settings: DEFAULT_BOOKING_SETTINGS, blocked: [], walletAvailableCents: cents(1_000_000), ...extra });

/** Snapshots of one deal along the way, through every field the store keeps. */
function journey(): BookingSnapshot[] {
  let s = createRequest(
    {
      id: 'b1',
      listingId: 'l1',
      renterId: 'renter',
      ownerId: 'owner',
      period: period(localDate('2027-03-02'), localDate('2027-03-04')),
      timeZone: 'Europe/Riga',
      pricing: { dailyCents: cents(1500), weeklyDiscountPercent: 10, depositCents: cents(10000), minDays: 1, maxDays: 30 },
      blocked: [],
    },
    ctx(now0),
  ).next;
  const seen = [s];
  const step = (actor: Actor, event: BookingEvent, at: number) => {
    s = decide(s, actor, event, ctx(hours(at))).next;
    seen.push(s);
  };
  step(owner, { type: 'ACCEPT' }, 1);
  step(renter, { type: 'SIGN' }, 2);
  step(owner, { type: 'SIGN' }, 3);
  step(renter, { type: 'PAY', method: 'WALLET' }, 4);
  step(owner, { type: 'MARK_HANDED_OVER' }, 20);
  step(renter, { type: 'CONFIRM_RECEIVED' }, 21);
  step(renter, { type: 'MARK_RETURNED' }, 70);
  step(owner, { type: 'CONFIRM_RETURNED' }, 71);
  step(owner, { type: 'REPORT_DAMAGE', description: 'The chuck is cracked.', photoIds: ['p1', 'p2'] }, 72);
  step(renter, { type: 'REJECT_DAMAGE', note: 'It was cracked before' }, 73);
  step(admin, { type: 'RESOLVE', decision: 'DEPOSIT_TO_OWNER', comment: 'Photos show it' }, 80);
  return seen;
}

function cancelled(): BookingSnapshot {
  const [requested] = journey();
  return decide(requested!, renter, { type: 'WITHDRAW' }, ctx(hours(1))).next;
}

/** What the database gives back for a row written from `s`. */
function row(s: BookingSnapshot): Booking {
  return {
    id: s.id,
    listingId: s.listingId,
    renterId: s.renterId,
    ownerId: s.ownerId,
    offerId: null,
    message: null,
    version: 0,
    createdAt: s.createdAt,
    ...snapshotData(s),
  } as unknown as Booking;
}

describe('booking.store', () => {
  it('keeps every snapshot of a deal exactly through the database row', () => {
    for (const s of [...journey(), cancelled()]) expect(toSnapshot(row(s))).toEqual(s);
  });

  it('stores the one armed timer in two columns', () => {
    const [requested] = journey();
    expect(snapshotData(requested!)).toMatchObject({ timerKind: 'REQUEST_EXPIRY', timerDueAt: requested!.timers.REQUEST_EXPIRY });
    expect(snapshotData(journey().at(-1)!)).toMatchObject({ timerKind: null, timerDueAt: null });
  });
});
