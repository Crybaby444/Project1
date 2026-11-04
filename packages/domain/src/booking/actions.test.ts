import { describe, expect, it } from 'vitest';
import { localDate, period } from '../dates';
import { DomainError } from '../errors';
import { cents } from '../money';
import { availableActions } from './actions';
import { decide } from './decide';
import { createRequest } from './request';
import {
  SAMPLE_EVENTS,
  admin,
  at,
  ctx,
  given,
  owner,
  renter,
  requestInput,
  step,
  stranger,
  system,
} from './test-support';
import type { Actor, BookingEvent, BookingEventType, BookingSnapshot, DecideContext } from './types';

const ACTORS: readonly Actor[] = [renter, owner, admin, system, stranger];
const TYPES: readonly BookingEventType[] = [...new Set(SAMPLE_EVENTS.map((event) => event.type))];

const { blocked: _blocked, ...withoutCalendar } = ctx;
/** 5 Nov 2026, 12:00 in Riga: the first rental day. */
const startDay: DecideContext = { ...ctx, now: new Date('2026-11-05T10:00:00Z') };
/** Paid on 4 Nov for 10–12 Nov: too early to hand over. */
function paidEarly(): BookingSnapshot {
  let s = createRequest(
    requestInput({ period: period(localDate('2026-11-10'), localDate('2026-11-12')) }),
    ctx,
  ).next;
  s = step(s, owner, { type: 'ACCEPT' });
  s = step(s, renter, { type: 'SIGN' });
  s = step(s, owner, { type: 'SIGN' });
  return step(s, renter, { type: 'PAY', method: 'CARD' });
}
const afterRentalEnded: DecideContext = { ...ctx, now: new Date('2026-11-07T22:30:00Z') }; // 8 Nov in Riga

function overdue(s: BookingSnapshot): DecideContext {
  const [timer] = Object.keys(s.timers) as (keyof BookingSnapshot['timers'])[];
  if (timer === undefined) throw new Error(`${s.status} has no timer`);
  return at(s, timer);
}

/** A booking in every status and sub-step, and the moment it is looked at. */
const SITUATIONS: ReadonlyArray<readonly [string, BookingSnapshot, DecideContext]> = [
  ['REQUESTED', given('REQUESTED'), ctx],
  [
    'REQUESTED, dates taken meanwhile',
    given('REQUESTED'),
    { ...ctx, blocked: [period(localDate('2026-11-06'), localDate('2026-11-06'))] },
  ],
  ['REQUESTED, calendar not given', given('REQUESTED'), withoutCalendar],
  ['REQUESTED, past its deadline', given('REQUESTED'), overdue(given('REQUESTED'))],
  ['ACCEPTED, nobody signed', given('ACCEPTED'), ctx],
  ['ACCEPTED, renter signed', given('ACCEPTED', { renterSigned: true }), ctx],
  ['ACCEPTED, both signed', given('ACCEPTED', { renterSigned: true, ownerSigned: true }), ctx],
  [
    'ACCEPTED, both signed, empty wallet',
    given('ACCEPTED', { renterSigned: true, ownerSigned: true }),
    { ...ctx, walletAvailableCents: cents(0) },
  ],
  ['ACCEPTED, past its deadline', given('ACCEPTED'), overdue(given('ACCEPTED'))],
  ['PAID', given('PAID'), ctx],
  ['PAID, start day, nothing marked', given('PAID'), startDay],
  ['PAID, handover deadline over', given('PAID'), overdue(given('PAID'))],
  ['PAID, paid well before the start', paidEarly(), ctx],
  ['PAID, handed over', given('PAID', { handedOver: true }), ctx],
  [
    'PAID, handover window over',
    given('PAID', { handedOver: true }),
    overdue(given('PAID', { handedOver: true })),
  ],
  ['ACTIVE', given('ACTIVE'), ctx],
  ['ACTIVE, rental over', given('ACTIVE'), afterRentalEnded],
  ['ACTIVE, returned', given('ACTIVE', { returned: true }), ctx],
  [
    'ACTIVE, return window over',
    given('ACTIVE', { returned: true }),
    overdue(given('ACTIVE', { returned: true })),
  ],
  ['RETURNED', given('RETURNED'), ctx],
  ['RETURNED, inspection window over', given('RETURNED'), overdue(given('RETURNED'))],
  ['DAMAGE_CLAIMED', given('DAMAGE_CLAIMED'), ctx],
  ['DAMAGE_CLAIMED, reply window over', given('DAMAGE_CLAIMED'), overdue(given('DAMAGE_CLAIMED'))],
  ['DISPUTED (DAMAGE)', given('DISPUTED', { dispute: 'DAMAGE' }), ctx],
  ['DISPUTED (NOT_RETURNED)', given('DISPUTED', { dispute: 'NOT_RETURNED' }), ctx],
  ['DISPUTED (NOT_HANDED_OVER)', given('DISPUTED', { dispute: 'NOT_HANDED_OVER' }), ctx],
  ['COMPLETED', given('COMPLETED'), ctx],
  ['DECLINED', given('DECLINED'), ctx],
  ['EXPIRED', given('EXPIRED'), ctx],
  ['CANCELLED', given('CANCELLED'), ctx],
];

/** True when decide takes the event and changes the booking. */
function accepts(s: BookingSnapshot, actor: Actor, event: BookingEvent, c: DecideContext): boolean {
  try {
    return decide(s, actor, event, c).next !== s;
  } catch (error) {
    if (error instanceof DomainError) return false;
    throw error;
  }
}

describe('availableActions agrees with decide', () => {
  it.each(SITUATIONS)('%s: everything listed is accepted, nothing else is', (_name, s, c) => {
    const problems: string[] = [];
    for (const actor of ACTORS) {
      const listed = availableActions(s, actor, c);
      if (new Set(listed).size !== listed.length)
        problems.push(`${actor.kind}: listed twice in ${listed.join(', ')}`);
      for (const type of TYPES) {
        const taken = SAMPLE_EVENTS.filter((event) => event.type === type).some((event) =>
          accepts(s, actor, event, c),
        );
        if (listed.includes(type) && !taken) problems.push(`${actor.kind} ${type}: listed but refused`);
        if (!listed.includes(type) && taken) problems.push(`${actor.kind} ${type}: accepted but not listed`);
      }
    }
    expect(problems).toEqual([]);
  });
});

describe('availableActions', () => {
  it('offers each side the buttons of its current step, in the table’s order', () => {
    expect(availableActions(given('REQUESTED'), owner, ctx)).toEqual(['ACCEPT', 'DECLINE']);
    expect(availableActions(given('REQUESTED'), renter, ctx)).toEqual(['WITHDRAW']);
    expect(availableActions(given('ACCEPTED'), renter, ctx)).toEqual(['SIGN', 'CANCEL']);
    const signed = given('ACCEPTED', { renterSigned: true, ownerSigned: true });
    expect(availableActions(signed, renter, ctx)).toEqual(['PAY', 'CANCEL']);
    expect(availableActions(signed, owner, ctx)).toEqual(['CANCEL']);
    expect(availableActions(given('PAID'), owner, ctx)).toEqual(['MARK_HANDED_OVER', 'CANCEL']);
    expect(availableActions(given('PAID'), renter, ctx)).toEqual(['CONFIRM_RECEIVED', 'CANCEL']);
    expect(availableActions(given('PAID'), renter, startDay)).toEqual([
      'CONFIRM_RECEIVED',
      'REPORT_NOT_RECEIVED',
    ]);
    expect(availableActions(given('PAID'), owner, startDay)).toEqual(['MARK_HANDED_OVER', 'CANCEL']);
    expect(availableActions(paidEarly(), owner, ctx)).toEqual(['CANCEL']);
    expect(availableActions(given('PAID', { handedOver: true }), owner, ctx)).toEqual([]);
    expect(availableActions(given('PAID', { handedOver: true }), renter, ctx)).toEqual([
      'CONFIRM_RECEIVED',
      'REPORT_NOT_RECEIVED',
    ]);
    expect(availableActions(given('ACTIVE'), renter, ctx)).toEqual(['MARK_RETURNED']);
    expect(availableActions(given('ACTIVE'), owner, ctx)).toEqual(['CONFIRM_RETURNED']);
    expect(availableActions(given('ACTIVE'), owner, afterRentalEnded)).toEqual([
      'CONFIRM_RETURNED',
      'REPORT_NOT_RETURNED',
    ]);
    expect(availableActions(given('RETURNED'), owner, ctx)).toEqual(['ALL_FINE', 'REPORT_DAMAGE']);
    expect(availableActions(given('DAMAGE_CLAIMED'), renter, ctx)).toEqual([
      'ACCEPT_DAMAGE',
      'REJECT_DAMAGE',
    ]);
    expect(availableActions(given('DISPUTED'), admin, ctx)).toEqual(['RESOLVE']);
  });

  it('offers PAY even when the wallet is short: the card still works', () => {
    const signed = given('ACCEPTED', { renterSigned: true, ownerSigned: true });
    expect(availableActions(signed, renter, { ...ctx, walletAvailableCents: cents(0) })).toEqual([
      'PAY',
      'CANCEL',
    ]);
  });

  it('hides ACCEPT when the dates were taken meanwhile or the calendar is unknown', () => {
    const taken = { ...ctx, blocked: [period(localDate('2026-11-06'), localDate('2026-11-06'))] };
    expect(availableActions(given('REQUESTED'), owner, taken)).toEqual(['DECLINE']);
    expect(availableActions(given('REQUESTED'), owner, withoutCalendar)).toEqual(['DECLINE']);
  });

  it('after a deadline offers the sides nothing and the system its timer', () => {
    const returned = given('RETURNED');
    expect(availableActions(returned, owner, ctx)).toEqual(['ALL_FINE', 'REPORT_DAMAGE']);
    expect(availableActions(returned, system, ctx)).toEqual([]);
    expect(availableActions(returned, owner, overdue(returned))).toEqual([]);
    expect(availableActions(returned, system, overdue(returned))).toEqual(['TIMEOUT']);
  });

  it('refuses a clock that is not a real moment', () => {
    expect(() => availableActions(given('RETURNED'), owner, { ...ctx, now: new Date(Number.NaN) })).toThrow(
      expect.objectContaining({ code: 'INVALID_INPUT' }),
    );
  });

  it('offers nothing in a closed booking or to someone outside it', () => {
    for (const status of ['COMPLETED', 'DECLINED', 'EXPIRED', 'CANCELLED'] as const) {
      for (const actor of ACTORS) expect(availableActions(given(status), actor, ctx)).toEqual([]);
    }
    expect(availableActions(given('REQUESTED'), stranger, ctx)).toEqual([]);
    expect(availableActions(given('REQUESTED'), { kind: 'RENTER', userId: 'someone-else' }, ctx)).toEqual([]);
    expect(availableActions(given('REQUESTED'), admin, ctx)).toEqual([]);
  });
});
