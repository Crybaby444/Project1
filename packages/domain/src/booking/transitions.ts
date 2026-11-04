import { addDays, compareDates, endOfDayIn, firstConflict, localDateIn } from '../dates';
import { DomainError } from '../errors';
import { validateBookingSettings } from '../settings';
import { bookingPayment, bookingRefund, depositRefund, depositToOwner, rentRelease } from '../ledger';
import type { LedgerOperation, PaymentMethod } from '../ledger';
import { TIMER_KINDS } from './types';
import type {
  Actor,
  ActorKind,
  BookingEvent,
  BookingEventType,
  BookingSnapshot,
  BookingStatus,
  BookingTemplate,
  DecideContext,
  Dispute,
  DisputeReason,
  Effect,
  Recipient,
  ResolveDecision,
  TimerKind,
} from './types';

/**
 * The booking state machine as one table (plan 4, Task 5). `decide` and `availableActions` both
 * read it; neither has transitions of its own. Internal: not exported from the package.
 */

const HOUR_MS = 3_600_000;
const TEXT_MAX = 2000;
const DESCRIPTION_MIN = 10;
const PHOTOS_MAX = 8;

/** Fields a transition may set. Status, timers and timestamps belong to the engine. */
export type Patch = Partial<
  Pick<
    BookingSnapshot,
    | 'renterSignedAt'
    | 'ownerSignedAt'
    | 'paymentMethod'
    | 'ownerHandedOverAt'
    | 'renterReceivedAt'
    | 'renterReturnedAt'
    | 'ownerReceivedBackAt'
    | 'declineReason'
    | 'damage'
    | 'dispute'
    | 'outcome'
    | 'cancellation'
  >
>;

/** What a transition does besides moving the booking to its status. */
export interface Change {
  readonly patch?: Patch;
  readonly schedule?: { readonly timer: TimerKind; readonly at: Date };
  /** Ledger, dates, contract, notifications and chat messages, in the table's order. */
  readonly effects?: readonly Effect[];
}

type EventOf<T extends BookingEventType> = Extract<BookingEvent, { type: T }>;

/** One row of the table: from which status, on which event, by whom, to which status. */
export interface Transition<T extends BookingEventType = BookingEventType> {
  readonly from: BookingStatus;
  readonly on: T;
  readonly by: readonly ActorKind[];
  readonly to: BookingStatus;
  /** TIMEOUT rows: the timer the row handles. */
  readonly timer?: TimerKind;
  /** RESOLVE rows: the admin's decision and the disputes it can settle. */
  readonly decision?: ResolveDecision;
  readonly disputes?: readonly DisputeReason[];
  /** True when the event would change nothing (signing twice): the booking stays as it is. */
  idempotent?(s: BookingSnapshot, actor: Actor): boolean;
  /** Conditions on the booking and the context, never on the event's data. Throws a DomainError. */
  guard?(s: BookingSnapshot, actor: Actor, ctx: DecideContext): void;
  /** Checks the event's data and describes the change. Throws a DomainError. */
  run(s: BookingSnapshot, actor: Actor, event: EventOf<T>, ctx: DecideContext): Change;
}

/**
 * Types a row by its event, then stores it untyped. Safe: `findTransition` only hands a row events
 * whose `type` equals its `on`. (TypeScript treats `T` as invariant through `Extract`, hence the cast.)
 */
function row<T extends BookingEventType>(transition: Transition<T>): Transition {
  return transition as unknown as Transition;
}

// ---- small helpers -------------------------------------------------------------------------------

const notify = (to: Recipient, template: BookingTemplate): Effect => ({ kind: 'NOTIFY', to, template });
const message = (template: BookingTemplate): Effect => ({ kind: 'SYSTEM_MESSAGE', template });
const RESERVE_DATES: Effect = { kind: 'RESERVE_DATES' };
const RELEASE_DATES: Effect = { kind: 'RELEASE_DATES' };
const GENERATE_CONTRACT: Effect = { kind: 'GENERATE_CONTRACT' };
const ledger = (operation: LedgerOperation | null): Effect[] =>
  operation === null ? [] : [{ kind: 'LEDGER', operation }];

/** `hours` after `now`, but no later than the end of the first rental day in the item's time zone. */
export function ttl(now: Date, hours: number, booking: Pick<BookingSnapshot, 'period' | 'timeZone'>): Date {
  const endOfFirstDay = endOfDayIn(booking.period.start, booking.timeZone);
  return new Date(Math.min(now.getTime() + hours * HOUR_MS, endOfFirstDay.getTime()));
}

const hoursAfter = (now: Date, hours: number): Date => new Date(now.getTime() + hours * HOUR_MS);

/** A paid booking nobody hands over goes to an admin this long after the end of the first day. */
export function handoverDeadline(booking: Pick<BookingSnapshot, 'period' | 'timeZone'>, hours: number): Date {
  return hoursAfter(endOfDayIn(booking.period.start, booking.timeZone), hours);
}

/** "Today" in the item's time zone, compared with the rental's first day: < 0 before it. */
const sinceStart = (s: BookingSnapshot, now: Date): number =>
  compareDates(localDateIn(now, s.timeZone), s.period.start);

function notAllowed(s: BookingSnapshot, actor: Actor, event: BookingEventType, why: string): DomainError {
  return new DomainError('TRANSITION_NOT_ALLOWED', { status: s.status, actor: actor.kind, event, why });
}

/** Free text people write: not blank, at most 2000 characters. */
function text(value: unknown, field: string, min = 1): string {
  if (typeof value !== 'string' || value.trim().length < min || value.length > TEXT_MAX) {
    throw new DomainError('INVALID_INPUT', { field, min, max: TEXT_MAX });
  }
  return value;
}

function photoIds(value: unknown): readonly string[] {
  const valid =
    Array.isArray(value) &&
    value.length >= 1 &&
    value.length <= PHOTOS_MAX &&
    value.every((id) => typeof id === 'string' && id !== '') &&
    new Set(value).size === value.length;
  if (!valid) throw new DomainError('INVALID_INPUT', { field: 'photoIds', min: 1, max: PHOTOS_MAX });
  return [...(value as string[])];
}

function paymentMethod(value: unknown): PaymentMethod {
  if (value === 'WALLET' || value === 'CARD') return value;
  throw new DomainError('INVALID_INPUT', { field: 'method', value: String(value) });
}

/** The method a paid booking was paid with: refunds and the deposit go back the same way. */
function paidWith(s: BookingSnapshot): PaymentMethod {
  if (s.paymentMethod === undefined) throw new DomainError('INVALID_INPUT', { field: 'paymentMethod' });
  return s.paymentMethod;
}

function side(actor: Actor): 'RENTER' | 'OWNER' {
  if (actor.kind === 'RENTER' || actor.kind === 'OWNER') return actor.kind;
  throw new DomainError('NOT_A_PARTY', { actor: actor.kind });
}

const otherSide = (actor: Actor): Recipient => (side(actor) === 'RENTER' ? 'OWNER' : 'RENTER');

function openDispute(s: BookingSnapshot): Dispute {
  if (s.dispute === undefined) throw new DomainError('INVALID_INPUT', { field: 'dispute' });
  return s.dispute;
}

function resolution(
  s: BookingSnapshot,
  actor: Actor,
  event: EventOf<'RESOLVE'>,
  ctx: DecideContext,
): Dispute {
  if (actor.kind !== 'ADMIN') throw new DomainError('NOT_A_PARTY', { actor: actor.kind });
  const comment = text(event.comment, 'comment');
  return {
    ...openDispute(s),
    resolution: { decision: event.decision, comment, by: actor.userId, at: ctx.now },
  };
}

// ---- money of each step --------------------------------------------------------------------------

const releaseRent = (s: BookingSnapshot) =>
  ledger(rentRelease({ bookingId: s.id, ownerId: s.ownerId, rentCents: s.quote.rentCents }));
const refundDeposit = (s: BookingSnapshot) =>
  ledger(
    depositRefund({
      bookingId: s.id,
      renterId: s.renterId,
      depositCents: s.quote.depositCents,
      method: paidWith(s),
    }),
  );
const giveDepositToOwner = (s: BookingSnapshot) =>
  ledger(depositToOwner({ bookingId: s.id, ownerId: s.ownerId, depositCents: s.quote.depositCents }));
const refundEverything = (s: BookingSnapshot) =>
  ledger(bookingRefund({ bookingId: s.id, renterId: s.renterId, quote: s.quote, method: paidWith(s) }));

// ---- steps shared by a party's event and a timer -------------------------------------------------

function handoverConfirmed(
  s: BookingSnapshot,
  actor: Actor,
  _event: BookingEvent,
  ctx: DecideContext,
): Change {
  return {
    patch: actor.kind === 'RENTER' ? { renterReceivedAt: ctx.now } : {},
    effects: [...releaseRent(s), notify('OWNER', 'RECEIVED'), message('RECEIVED')],
  };
}

function returnConfirmed(
  _s: BookingSnapshot,
  actor: Actor,
  _event: BookingEvent,
  ctx: DecideContext,
): Change {
  return {
    patch: actor.kind === 'OWNER' ? { ownerReceivedBackAt: ctx.now } : {},
    schedule: { timer: 'INSPECTION', at: hoursAfter(ctx.now, ctx.settings.inspectionHours) },
    effects: [RELEASE_DATES, notify('RENTER', 'RECEIVED_BACK'), message('RECEIVED_BACK')],
  };
}

function allFine(s: BookingSnapshot): Change {
  return {
    patch: { outcome: 'DEPOSIT_REFUNDED' },
    effects: [...refundDeposit(s), notify('RENTER', 'ALL_FINE'), message('ALL_FINE')],
  };
}

function damageDisputed(_s: BookingSnapshot, _actor: Actor, event: BookingEvent, ctx: DecideContext): Change {
  const note = event.type === 'REJECT_DAMAGE' ? { note: text(event.note, 'note') } : {};
  return {
    patch: { dispute: { reason: 'DAMAGE', openedAt: ctx.now, ...note } },
    effects: [
      notify('ADMINS', 'DISPUTE_OPENED'),
      notify('OWNER', 'DISPUTE_OPENED'),
      message('DISPUTE_OPENED'),
    ],
  };
}

const disputeResolved: readonly Effect[] = [
  notify('RENTER', 'DISPUTE_RESOLVED'),
  notify('OWNER', 'DISPUTE_RESOLVED'),
  message('DISPUTE_RESOLVED'),
];

// ---- the table -----------------------------------------------------------------------------------

export const TRANSITIONS: readonly Transition[] = [
  row({
    from: 'REQUESTED',
    on: 'ACCEPT',
    by: ['OWNER'],
    to: 'ACCEPTED',
    guard(s, _actor, ctx) {
      if (ctx.blocked === undefined) throw new DomainError('INVALID_INPUT', { field: 'blocked' });
      const conflict = firstConflict(s.period, ctx.blocked);
      if (conflict !== null) throw new DomainError('DATES_UNAVAILABLE', { conflict });
    },
    run: (s, _actor, _event, ctx) => ({
      schedule: { timer: 'PAYMENT_EXPIRY', at: ttl(ctx.now, ctx.settings.paymentTtlHours, s) },
      effects: [RESERVE_DATES, GENERATE_CONTRACT, notify('RENTER', 'ACCEPTED'), message('ACCEPTED')],
    }),
  }),
  row({
    from: 'REQUESTED',
    on: 'DECLINE',
    by: ['OWNER'],
    to: 'DECLINED',
    run: (_s, _actor, event) => ({
      patch: event.reason === undefined ? {} : { declineReason: text(event.reason, 'reason') },
      effects: [notify('RENTER', 'DECLINED'), message('DECLINED')],
    }),
  }),
  row({
    from: 'REQUESTED',
    on: 'WITHDRAW',
    by: ['RENTER'],
    to: 'CANCELLED',
    run: (_s, _actor, _event, ctx) => ({
      patch: { cancellation: { by: 'RENTER', at: ctx.now } },
      effects: [notify('OWNER', 'CANCELLED'), message('CANCELLED')],
    }),
  }),
  row({
    from: 'REQUESTED',
    on: 'TIMEOUT',
    timer: 'REQUEST_EXPIRY',
    by: ['SYSTEM'],
    to: 'EXPIRED',
    run: () => ({ effects: [notify('RENTER', 'EXPIRED'), notify('OWNER', 'EXPIRED'), message('EXPIRED')] }),
  }),
  row({
    from: 'ACCEPTED',
    on: 'SIGN',
    by: ['RENTER', 'OWNER'],
    to: 'ACCEPTED',
    idempotent: (s, actor) => (side(actor) === 'RENTER' ? s.renterSignedAt : s.ownerSignedAt) !== undefined,
    run: (_s, actor, _event, ctx) => ({
      patch: side(actor) === 'RENTER' ? { renterSignedAt: ctx.now } : { ownerSignedAt: ctx.now },
      effects: [message('SIGNED')],
    }),
  }),
  row({
    from: 'ACCEPTED',
    on: 'PAY',
    by: ['RENTER'],
    to: 'PAID',
    guard(s) {
      if (s.renterSignedAt === undefined || s.ownerSignedAt === undefined) {
        throw new DomainError('CONTRACT_NOT_SIGNED', {
          renterSigned: s.renterSignedAt !== undefined,
          ownerSigned: s.ownerSignedAt !== undefined,
        });
      }
    },
    run(s, _actor, event, ctx) {
      const method = paymentMethod(event.method);
      if (method === 'WALLET') {
        const available = ctx.walletAvailableCents;
        if (available === undefined)
          throw new DomainError('INVALID_INPUT', { field: 'walletAvailableCents' });
        if (available < s.quote.totalCents) {
          throw new DomainError('INSUFFICIENT_FUNDS', {
            availableCents: available,
            neededCents: s.quote.totalCents,
            shortfallCents: s.quote.totalCents - available,
          });
        }
      }
      return {
        patch: { paymentMethod: method },
        schedule: {
          timer: 'HANDOVER_DEADLINE',
          at: handoverDeadline(s, ctx.settings.handoverConfirmHours),
        },
        effects: [
          ...ledger(bookingPayment({ bookingId: s.id, renterId: s.renterId, quote: s.quote, method })),
          notify('OWNER', 'PAID'),
          message('PAID'),
        ],
      };
    },
  }),
  row({
    from: 'ACCEPTED',
    on: 'CANCEL',
    by: ['RENTER', 'OWNER'],
    to: 'CANCELLED',
    run: (_s, actor, event, ctx) => ({
      patch: { cancellation: { by: side(actor), reason: text(event.reason, 'reason'), at: ctx.now } },
      effects: [RELEASE_DATES, notify(otherSide(actor), 'CANCELLED'), message('CANCELLED')],
    }),
  }),
  row({
    from: 'ACCEPTED',
    on: 'TIMEOUT',
    timer: 'PAYMENT_EXPIRY',
    by: ['SYSTEM'],
    to: 'EXPIRED',
    run: () => ({
      effects: [RELEASE_DATES, notify('RENTER', 'EXPIRED'), notify('OWNER', 'EXPIRED'), message('EXPIRED')],
    }),
  }),
  row({
    from: 'PAID',
    on: 'MARK_HANDED_OVER',
    by: ['OWNER'],
    to: 'PAID',
    guard(s, actor, ctx) {
      if (s.ownerHandedOverAt !== undefined)
        throw notAllowed(s, actor, 'MARK_HANDED_OVER', 'ALREADY_HANDED_OVER');
      // Early pickup the evening before is fine; weeks ahead is not.
      const dayBefore = addDays(s.period.start, -1);
      if (compareDates(localDateIn(ctx.now, s.timeZone), dayBefore) < 0)
        throw notAllowed(s, actor, 'MARK_HANDED_OVER', 'TOO_EARLY');
    },
    run: (_s, _actor, _event, ctx) => ({
      patch: { ownerHandedOverAt: ctx.now },
      schedule: { timer: 'HANDOVER_CONFIRM', at: hoursAfter(ctx.now, ctx.settings.handoverConfirmHours) },
      effects: [notify('RENTER', 'HANDED_OVER'), message('HANDED_OVER')],
    }),
  }),
  row({ from: 'PAID', on: 'CONFIRM_RECEIVED', by: ['RENTER'], to: 'ACTIVE', run: handoverConfirmed }),
  row({
    from: 'PAID',
    on: 'TIMEOUT',
    timer: 'HANDOVER_CONFIRM',
    by: ['SYSTEM'],
    to: 'ACTIVE',
    run: handoverConfirmed,
  }),
  row({
    from: 'PAID',
    on: 'TIMEOUT',
    timer: 'HANDOVER_DEADLINE',
    by: ['SYSTEM'],
    to: 'DISPUTED',
    run: (_s, _actor, _event, ctx) => ({
      patch: { dispute: { reason: 'NOT_HANDED_OVER', openedAt: ctx.now } },
      effects: [
        notify('ADMINS', 'DISPUTE_OPENED'),
        notify('RENTER', 'DISPUTE_OPENED'),
        notify('OWNER', 'DISPUTE_OPENED'),
        message('DISPUTE_OPENED'),
      ],
    }),
  }),
  row({
    from: 'PAID',
    on: 'REPORT_NOT_RECEIVED',
    by: ['RENTER'],
    to: 'DISPUTED',
    // The owner says "handed over", or the rental has started and the owner did not show up.
    guard(s, actor, ctx) {
      if (s.ownerHandedOverAt === undefined && sinceStart(s, ctx.now) < 0)
        throw notAllowed(s, actor, 'REPORT_NOT_RECEIVED', 'NOT_HANDED_OVER_YET');
    },
    run: (_s, _actor, event, ctx) => ({
      patch: { dispute: { reason: 'NOT_HANDED_OVER', openedAt: ctx.now, note: text(event.note, 'note') } },
      effects: [
        notify('ADMINS', 'DISPUTE_OPENED'),
        notify('OWNER', 'DISPUTE_OPENED'),
        message('DISPUTE_OPENED'),
      ],
    }),
  }),
  row({
    from: 'PAID',
    on: 'CANCEL',
    by: ['RENTER', 'OWNER'],
    to: 'CANCELLED',
    // Once the owner says "handed over", the renter may hold the item: no cancelling for a full refund.
    // From the first rental day the renter may hold it unmarked, so cancelling alone ends there; the
    // renter confirms or reports "not received" instead.
    guard(s, actor, ctx) {
      if (s.ownerHandedOverAt !== undefined) throw notAllowed(s, actor, 'CANCEL', 'ALREADY_HANDED_OVER');
      if (side(actor) === 'RENTER' && sinceStart(s, ctx.now) >= 0)
        throw notAllowed(s, actor, 'CANCEL', 'RENTAL_STARTED');
    },
    run: (s, actor, event, ctx) => ({
      patch: {
        cancellation: { by: side(actor), reason: text(event.reason, 'reason'), at: ctx.now },
        outcome: 'REFUNDED_ALL',
      },
      effects: [
        ...refundEverything(s),
        RELEASE_DATES,
        notify(otherSide(actor), 'CANCELLED'),
        message('CANCELLED'),
      ],
    }),
  }),
  row({
    from: 'ACTIVE',
    on: 'MARK_RETURNED',
    by: ['RENTER'],
    to: 'ACTIVE',
    guard(s, actor) {
      if (s.renterReturnedAt !== undefined) throw notAllowed(s, actor, 'MARK_RETURNED', 'ALREADY_RETURNED');
    },
    run: (_s, _actor, _event, ctx) => ({
      patch: { renterReturnedAt: ctx.now },
      schedule: { timer: 'RETURN_CONFIRM', at: hoursAfter(ctx.now, ctx.settings.returnConfirmHours) },
      effects: [notify('OWNER', 'RETURNED'), message('RETURNED')],
    }),
  }),
  row({ from: 'ACTIVE', on: 'CONFIRM_RETURNED', by: ['OWNER'], to: 'RETURNED', run: returnConfirmed }),
  row({
    from: 'ACTIVE',
    on: 'TIMEOUT',
    timer: 'RETURN_CONFIRM',
    by: ['SYSTEM'],
    to: 'RETURNED',
    run: returnConfirmed,
  }),
  row({
    from: 'ACTIVE',
    on: 'REPORT_NOT_RETURNED',
    by: ['OWNER'],
    to: 'DISPUTED',
    guard(s, actor, ctx) {
      const rentalOver = compareDates(localDateIn(ctx.now, s.timeZone), s.period.end) > 0;
      if (s.renterReturnedAt === undefined && !rentalOver) {
        throw notAllowed(s, actor, 'REPORT_NOT_RETURNED', 'RENTAL_NOT_OVER');
      }
    },
    run: (_s, _actor, event, ctx) => ({
      patch: { dispute: { reason: 'NOT_RETURNED', openedAt: ctx.now, note: text(event.note, 'note') } },
      effects: [
        notify('ADMINS', 'DISPUTE_OPENED'),
        notify('RENTER', 'DISPUTE_OPENED'),
        message('DISPUTE_OPENED'),
      ],
    }),
  }),
  row({ from: 'RETURNED', on: 'ALL_FINE', by: ['OWNER'], to: 'COMPLETED', run: allFine }),
  row({
    from: 'RETURNED',
    on: 'TIMEOUT',
    timer: 'INSPECTION',
    by: ['SYSTEM'],
    to: 'COMPLETED',
    run: allFine,
  }),
  row({
    from: 'RETURNED',
    on: 'REPORT_DAMAGE',
    by: ['OWNER'],
    to: 'DAMAGE_CLAIMED',
    run: (_s, _actor, event, ctx) => ({
      patch: {
        damage: {
          description: text(event.description, 'description', DESCRIPTION_MIN),
          photoIds: photoIds(event.photoIds),
          claimedAt: ctx.now,
        },
      },
      schedule: { timer: 'DAMAGE_REPLY', at: hoursAfter(ctx.now, ctx.settings.damageReplyHours) },
      effects: [notify('RENTER', 'DAMAGE_REPORTED'), message('DAMAGE_REPORTED')],
    }),
  }),
  row({
    from: 'DAMAGE_CLAIMED',
    on: 'ACCEPT_DAMAGE',
    by: ['RENTER'],
    to: 'COMPLETED',
    run: (s) => ({
      patch: { outcome: 'DEPOSIT_TO_OWNER' },
      effects: [...giveDepositToOwner(s), notify('OWNER', 'DAMAGE_ACCEPTED'), message('DAMAGE_ACCEPTED')],
    }),
  }),
  row({ from: 'DAMAGE_CLAIMED', on: 'REJECT_DAMAGE', by: ['RENTER'], to: 'DISPUTED', run: damageDisputed }),
  row({
    from: 'DAMAGE_CLAIMED',
    on: 'TIMEOUT',
    timer: 'DAMAGE_REPLY',
    by: ['SYSTEM'],
    to: 'DISPUTED',
    run: damageDisputed,
  }),
  row({
    from: 'DISPUTED',
    on: 'RESOLVE',
    decision: 'REFUND_DEPOSIT',
    disputes: ['DAMAGE', 'NOT_RETURNED'],
    by: ['ADMIN'],
    to: 'COMPLETED',
    run: (s, actor, event, ctx) => ({
      patch: { outcome: 'DEPOSIT_REFUNDED', dispute: resolution(s, actor, event, ctx) },
      effects: [
        ...refundDeposit(s),
        ...(openDispute(s).reason === 'NOT_RETURNED' ? [RELEASE_DATES] : []),
        ...disputeResolved,
      ],
    }),
  }),
  row({
    from: 'DISPUTED',
    on: 'RESOLVE',
    decision: 'DEPOSIT_TO_OWNER',
    disputes: ['DAMAGE', 'NOT_RETURNED'],
    by: ['ADMIN'],
    to: 'COMPLETED',
    run: (s, actor, event, ctx) => ({
      patch: { outcome: 'DEPOSIT_TO_OWNER', dispute: resolution(s, actor, event, ctx) },
      effects: [
        ...giveDepositToOwner(s),
        ...(openDispute(s).reason === 'NOT_RETURNED' ? [RELEASE_DATES] : []),
        ...disputeResolved,
      ],
    }),
  }),
  row({
    from: 'DISPUTED',
    on: 'RESOLVE',
    decision: 'REFUND_ALL',
    disputes: ['NOT_HANDED_OVER'],
    by: ['ADMIN'],
    to: 'CANCELLED',
    run: (s, actor, event, ctx) => ({
      patch: {
        outcome: 'REFUNDED_ALL',
        // resolution() has checked the comment; it is also the reason of the cancellation.
        dispute: resolution(s, actor, event, ctx),
        cancellation: { by: 'ADMIN', reason: event.comment, at: ctx.now },
      },
      effects: [...refundEverything(s), RELEASE_DATES, ...disputeResolved],
    }),
  }),
  row({
    from: 'DISPUTED',
    on: 'RESOLVE',
    decision: 'CONFIRM_HANDOVER',
    disputes: ['NOT_HANDED_OVER'],
    by: ['ADMIN'],
    to: 'ACTIVE',
    run: (s, actor, event, ctx) => ({
      patch: { dispute: resolution(s, actor, event, ctx) },
      effects: [...releaseRent(s), ...disputeResolved],
    }),
  }),
];

// ---- reading the table ---------------------------------------------------------------------------

/**
 * The clock the API passes in has to be a real moment: compared with an invalid date, every deadline
 * would look due and every timer would fire.
 */
export function checkClock(now: Date): void {
  checkDate(now, 'now');
}

/** A moment the rules compare with: a Date that holds a real time, else `INVALID_INPUT`. */
export function checkDate(value: unknown, field: string): Date {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new DomainError('INVALID_INPUT', { field, value: String(value) });
  }
  return value;
}

/** The context every entry point checks first: a real clock and valid settings. */
export function checkContext(ctx: DecideContext): void {
  checkClock(ctx.now);
  validateBookingSettings(ctx.settings);
}

/** The timers a booking may have armed in `status`: those its TIMEOUT rows handle. */
export function armableTimers(status: BookingStatus): readonly TimerKind[] {
  return TRANSITIONS.flatMap((t) => (t.from === status && t.timer !== undefined ? [t.timer] : []));
}

/**
 * Whether `actor` may send events of this type to this booking at all: the renter and the owner of
 * this booking for their own events, an admin only to resolve, the system only to fire timers.
 */
export function mayAct(s: BookingSnapshot, actor: Actor, type: BookingEventType): boolean {
  switch (actor.kind) {
    case 'RENTER':
      return actor.userId === s.renterId;
    case 'OWNER':
      return actor.userId === s.ownerId;
    case 'ADMIN':
      return type === 'RESOLVE';
    case 'SYSTEM':
      return type === 'TIMEOUT';
    default:
      return false;
  }
}

/**
 * The armed timer whose deadline has passed, if any. A stored deadline that is not a real moment is
 * refused (`INVALID_INPUT`): read as "not due", it would let a late action through; read as "due",
 * it would fire at once.
 */
export function overdueTimer(s: BookingSnapshot, now: Date): TimerKind | undefined {
  return TIMER_KINDS.find((timer) => {
    const due = s.timers[timer];
    return due !== undefined && checkDate(due, `timers.${timer}`).getTime() <= now.getTime();
  });
}

/** Rows that apply to this booking's status (and, for RESOLVE, its dispute) for this kind of actor. */
export function transitionsFor(s: BookingSnapshot, kind: ActorKind): Transition[] {
  return TRANSITIONS.filter(
    (t) =>
      t.from === s.status &&
      t.by.includes(kind) &&
      (t.disputes === undefined || (s.dispute !== undefined && t.disputes.includes(s.dispute.reason))),
  );
}

/** The row for this event, or undefined when the table has none. */
export function findTransition(
  s: BookingSnapshot,
  actor: Actor,
  event: BookingEvent,
): Transition | undefined {
  return transitionsFor(s, actor.kind).find(
    (t) =>
      t.on === event.type &&
      (t.timer === undefined || (event.type === 'TIMEOUT' && event.timer === t.timer)) &&
      (t.decision === undefined || (event.type === 'RESOLVE' && event.decision === t.decision)),
  );
}
