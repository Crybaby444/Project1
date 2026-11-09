import { CLOSED_BOOKING_STATUSES, type BookingStatus, type StatusTone } from '@yoyo/shared';

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
