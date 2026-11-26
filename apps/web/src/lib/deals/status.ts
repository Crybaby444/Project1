import { CLOSED_BOOKING_STATUSES, waitsForStep, type BookingStatus, type BookingView, type StatusTone } from '@yoyo/shared';
import { addDays, todayIn } from '@/lib/listings/calendar';

/**
 * Deal statuses in the sticker palette (DESIGN.md "Project adaptations" §4, spec §4.4): a request and a
 * deal waiting for payment are Sunburst; paid (deposit frozen) and returned (deposit frozen while the
 * owner inspects) are Lavender; the rental itself is Electric Blue; damage and disputes are Ember;
 * completed is Voltage Violet; declined, expired and cancelled are Soft Mist.
 */
const TONE: Record<BookingStatus, StatusTone> = {
  REQUESTED: 'requested',
  ACCEPTED: 'requested',
  PAID: 'deposit',
  ACTIVE: 'active',
  RETURNED: 'deposit',
  DAMAGE_CLAIMED: 'dispute',
  DISPUTED: 'dispute',
  COMPLETED: 'completed',
  DECLINED: 'cancelled',
  EXPIRED: 'cancelled',
  CANCELLED: 'cancelled',
};

export function toneOf(status: BookingStatus): StatusTone {
  return TONE[status];
}

export function isClosed(status: BookingStatus): boolean {
  return (CLOSED_BOOKING_STATUSES as readonly BookingStatus[]).includes(status);
}

/** The tabs inside a role of "My deals": waiting for me, going on, ended. */
export const DEAL_GROUPS = ['action', 'open', 'closed'] as const;

export type DealGroup = (typeof DEAL_GROUPS)[number];

export const DEAL_ROLES = ['renter', 'owner'] as const;

export type DealRole = (typeof DEAL_ROLES)[number];

/**
 * The deal waits for this side now: a step that moves it forward, not a way out, and nobody's turn during a
 * rental before its last day (shared with the API's count in the menu: `waitsForStep`). `now` is the page's
 * clock (next-intl `useNow`); the day is the deal's own, where the item is.
 */
export function isMyTurn(booking: Pick<BookingView, 'status' | 'actions' | 'period' | 'timeZone'>, now: Date): boolean {
  return waitsForStep(booking, todayIn(booking.timeZone, now));
}

/**
 * Whose move it is, in words for the deal page and its chat strip: this side's, or what the deal waits for
 * when it is nobody's step yet (the day of the handover, the end of the rental, Yoyo's decision in a
 * dispute) rather than "the other side", who is not holding anything up then.
 */
export function turnKey(
  booking: Pick<BookingView, 'status' | 'actions' | 'period' | 'timeZone'>,
  now: Date,
): 'yourTurn' | 'waitHandoverDay' | 'rentalOn' | 'yoyoDecides' | 'theirTurn' {
  if (isMyTurn(booking, now)) return 'yourTurn';
  if (booking.status === 'DISPUTED') return 'yoyoDecides';
  const today = todayIn(booking.timeZone, now);
  if (booking.status === 'PAID' && today < addDays(booking.period.start, -1)) return 'waitHandoverDay';
  if (booking.status === 'ACTIVE' && today < booking.period.end) return 'rentalOn';
  return 'theirTurn';
}
