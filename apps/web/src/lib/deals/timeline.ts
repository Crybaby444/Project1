import type { BookingHistoryItem, BookingStatus, BookingView } from '@yoyo/shared';

/**
 * The deal's path as the deal page draws it (spec §4.4: "both sides always see which step the deal is
 * on and what comes next"). A pure function of the deal and its journal; the rules themselves stay in
 * @yoyo/domain, this only reads where the deal is.
 */
export type StepKey =
  | 'request'
  | 'answer'
  | 'sign'
  | 'pay'
  | 'handover'
  | 'return'
  | 'inspect'
  | 'damage'
  | 'dispute'
  | 'end';

/**
 * - `done`: behind the deal; `current`: the deal is here now (its deadline, if any, counts down);
 * - `upcoming`: still ahead; `stopped`: the deal ended here (declined, withdrawn, expired, cancelled);
 * - `skipped`: will not happen because the deal ended earlier.
 */
export type StepState = 'done' | 'current' | 'upcoming' | 'stopped' | 'skipped';

export interface TimelineStep {
  key: StepKey;
  state: StepState;
  /** When the step was done (or stopped), when known. */
  at: string | null;
}

const MAIN: StepKey[] = ['request', 'answer', 'sign', 'pay', 'handover', 'return', 'inspect'];

/** The first moment the deal moved into `status` (from the journal). */
function enteredAt(history: BookingHistoryItem[], status: BookingStatus): string | null {
  return history.find((item) => item.toStatus === status && item.fromStatus !== status)?.at ?? null;
}

function lastEvent(history: BookingHistoryItem[], type: string): string | null {
  return history.findLast((item) => item.type === type)?.at ?? null;
}

const later = (a: string | null, b: string | null) => (a && b ? (a > b ? a : b) : null);

/** The status a closed deal ended from: the journal's last move into it, or a guess from the deal itself. */
function endedFrom(booking: BookingView, history: BookingHistoryItem[]): BookingStatus {
  const move = history.findLast((item) => item.toStatus === booking.status && item.fromStatus !== booking.status);
  if (move?.fromStatus) return move.fromStatus;
  if (booking.status === 'DECLINED') return 'REQUESTED';
  if (booking.dispute) return 'DISPUTED';
  if (booking.paymentMethod) return 'PAID';
  return booking.hasContract ? 'ACCEPTED' : 'REQUESTED';
}

/** The step a deal in `status` is on (for an ACCEPTED deal: signing until both signed, then paying). */
function stepOf(status: BookingStatus, booking: BookingView): StepKey {
  switch (status) {
    case 'REQUESTED':
      return 'answer';
    case 'ACCEPTED':
      return booking.renterSignedAt && booking.ownerSignedAt ? 'pay' : 'sign';
    case 'PAID':
      return 'handover';
    case 'ACTIVE':
      return 'return';
    case 'RETURNED':
      return 'inspect';
    case 'DAMAGE_CLAIMED':
      return 'damage';
    case 'DISPUTED':
      return 'dispute';
    default:
      return 'end';
  }
}

/** Where a dispute goes in the path: after the step it is about. */
function disputeAfter(reason: NonNullable<BookingView['dispute']>['reason']): StepKey {
  return reason === 'NOT_HANDED_OVER' ? 'handover' : reason === 'NOT_RETURNED' ? 'return' : 'damage';
}

export function dealTimeline(booking: BookingView, history: BookingHistoryItem[] = []): TimelineStep[] {
  // The path this deal takes: the main steps, plus damage and dispute where they happened.
  const keys: StepKey[] = [...MAIN];
  if (booking.damage || booking.status === 'DAMAGE_CLAIMED') keys.splice(keys.indexOf('inspect') + 1, 0, 'damage');
  if (booking.dispute) {
    const after = disputeAfter(booking.dispute.reason);
    if (!keys.includes(after)) keys.splice(keys.indexOf('inspect') + 1, 0, after);
    keys.splice(keys.indexOf(after) + 1, 0, 'dispute');
  }
  keys.push('end');

  const closed = ['COMPLETED', 'DECLINED', 'EXPIRED', 'CANCELLED'].includes(booking.status);
  const failed = closed && booking.status !== 'COMPLETED';
  const here: StepKey = failed ? stepOf(endedFrom(booking, history), booking) : stepOf(booking.status, booking);
  const hereIndex = keys.indexOf(here);

  const doneAt: Record<StepKey, string | null> = {
    request: lastEvent(history, 'REQUEST') ?? booking.createdAt,
    answer: lastEvent(history, 'ACCEPT'),
    sign: later(booking.renterSignedAt, booking.ownerSignedAt),
    pay: lastEvent(history, 'PAY'),
    handover: booking.renterReceivedAt ?? enteredAt(history, 'ACTIVE'),
    return: booking.ownerReceivedBackAt ?? enteredAt(history, 'RETURNED'),
    inspect: booking.damage?.claimedAt ?? booking.completedAt,
    damage: enteredAt(history, booking.status === 'COMPLETED' ? 'COMPLETED' : 'DISPUTED'),
    dispute: booking.dispute?.resolution?.at ?? null,
    end: booking.completedAt ?? booking.cancellation?.at ?? enteredAt(history, booking.status),
  };
  // A dispute resolved by confirming the handover sends the deal back to ACTIVE: the handover is behind it.
  if (booking.dispute?.reason === 'NOT_HANDED_OVER' && booking.dispute.resolution) doneAt.handover = booking.dispute.resolution.at;

  return keys.map((key, index): TimelineStep => {
    if (key === 'end') {
      if (booking.status === 'COMPLETED') return { key, state: 'done', at: doneAt.end };
      if (failed) return { key, state: 'stopped', at: doneAt.end };
      return { key, state: 'upcoming', at: null };
    }
    if (booking.status === 'COMPLETED') return { key, state: 'done', at: doneAt[key] };
    if (index < hereIndex) return { key, state: 'done', at: doneAt[key] };
    if (index === hereIndex) {
      // A deal that ended in a dispute's ruling (REFUND_ALL) has the dispute behind it.
      if (failed && key === 'dispute' && booking.dispute?.resolution) return { key, state: 'done', at: doneAt.dispute };
      return failed ? { key, state: 'stopped', at: doneAt.end } : { key, state: 'current', at: null };
    }
    return { key, state: failed ? 'skipped' : 'upcoming', at: null };
  });
}
