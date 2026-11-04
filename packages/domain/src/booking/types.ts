import type { Period } from '../dates';
import type { LedgerOperation, PaymentMethod } from '../ledger';
import type { Cents } from '../money';
import type { Quote } from '../pricing';
import type { BookingSettings } from '../settings';

export const BOOKING_STATUSES = [
  'REQUESTED',
  'ACCEPTED',
  'PAID',
  'ACTIVE',
  'RETURNED',
  'DAMAGE_CLAIMED',
  'DISPUTED',
  'COMPLETED',
  'DECLINED',
  'EXPIRED',
  'CANCELLED',
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** Statuses a booking never leaves. */
export const TERMINAL_STATUSES = [
  'COMPLETED',
  'DECLINED',
  'EXPIRED',
  'CANCELLED',
] as const satisfies readonly BookingStatus[];

export function isTerminal(status: BookingStatus): boolean {
  return (TERMINAL_STATUSES as readonly BookingStatus[]).includes(status);
}

/** Deadlines a booking can wait on. At most one is armed at a time, the one of its current step. */
export const TIMER_KINDS = [
  'REQUEST_EXPIRY',
  'PAYMENT_EXPIRY',
  /** Paid, and nobody has marked the handover by the end of the first day plus `handoverConfirmHours`. */
  'HANDOVER_DEADLINE',
  'HANDOVER_CONFIRM',
  'RETURN_CONFIRM',
  'INSPECTION',
  'DAMAGE_REPLY',
] as const;

export type TimerKind = (typeof TIMER_KINDS)[number];

export type DisputeReason = 'DAMAGE' | 'NOT_RETURNED' | 'NOT_HANDED_OVER';

/** Where the money went when the booking closed. */
export type BookingOutcome = 'DEPOSIT_REFUNDED' | 'DEPOSIT_TO_OWNER' | 'REFUNDED_ALL';

export type ResolveDecision = 'REFUND_DEPOSIT' | 'DEPOSIT_TO_OWNER' | 'REFUND_ALL' | 'CONFIRM_HANDOVER';

export interface DamageClaim {
  readonly description: string;
  readonly photoIds: readonly string[];
  readonly claimedAt: Date;
}

export interface DisputeResolution {
  readonly decision: ResolveDecision;
  readonly comment: string;
  /** The admin's user id. */
  readonly by: string;
  readonly at: Date;
}

export interface Dispute {
  readonly reason: DisputeReason;
  readonly openedAt: Date;
  readonly note?: string;
  readonly resolution?: DisputeResolution;
}

export interface Cancellation {
  readonly by: 'RENTER' | 'OWNER' | 'ADMIN';
  /** Required when a party cancels; the admin's comment for REFUND_ALL; absent for a withdrawn request. */
  readonly reason?: string;
  readonly at: Date;
}

/** Everything the rules need to know about one booking. The API stores it; the core never does. */
export interface BookingSnapshot {
  readonly id: string;
  readonly listingId: string;
  readonly renterId: string;
  readonly ownerId: string;
  readonly status: BookingStatus;
  readonly period: Period;
  /** The item's time zone: it decides what "today" and "the end of the first day" mean. */
  readonly timeZone: string;
  readonly quote: Quote;

  readonly renterSignedAt?: Date;
  readonly ownerSignedAt?: Date;
  readonly paymentMethod?: PaymentMethod;
  readonly ownerHandedOverAt?: Date;
  readonly renterReceivedAt?: Date;
  readonly renterReturnedAt?: Date;
  readonly ownerReceivedBackAt?: Date;

  readonly declineReason?: string;
  readonly damage?: DamageClaim;
  /** The latest dispute; a booking returned to ACTIVE by an admin can open another one. */
  readonly dispute?: Dispute;

  readonly outcome?: BookingOutcome;
  readonly cancellation?: Cancellation;

  /** Armed timers and when they come due. */
  readonly timers: Readonly<Partial<Record<TimerKind, Date>>>;

  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly completedAt?: Date;
}

export type Actor =
  | { readonly kind: 'RENTER'; readonly userId: string }
  | { readonly kind: 'OWNER'; readonly userId: string }
  | { readonly kind: 'ADMIN'; readonly userId: string }
  | { readonly kind: 'SYSTEM' };

export type ActorKind = Actor['kind'];

export type BookingEvent =
  | { readonly type: 'ACCEPT' }
  | { readonly type: 'DECLINE'; readonly reason?: string }
  | { readonly type: 'WITHDRAW' }
  | { readonly type: 'SIGN' }
  | { readonly type: 'PAY'; readonly method: PaymentMethod }
  | { readonly type: 'CANCEL'; readonly reason: string }
  | { readonly type: 'MARK_HANDED_OVER' }
  | { readonly type: 'CONFIRM_RECEIVED' }
  | { readonly type: 'REPORT_NOT_RECEIVED'; readonly note: string }
  | { readonly type: 'MARK_RETURNED' }
  | { readonly type: 'CONFIRM_RETURNED' }
  | { readonly type: 'REPORT_NOT_RETURNED'; readonly note: string }
  | { readonly type: 'ALL_FINE' }
  | { readonly type: 'REPORT_DAMAGE'; readonly description: string; readonly photoIds: readonly string[] }
  | { readonly type: 'ACCEPT_DAMAGE' }
  | { readonly type: 'REJECT_DAMAGE'; readonly note: string }
  | { readonly type: 'RESOLVE'; readonly decision: ResolveDecision; readonly comment: string }
  | { readonly type: 'TIMEOUT'; readonly timer: TimerKind };

export type BookingEventType = BookingEvent['type'];

/** Notifications and chat system messages, by name; the texts live with the translations. */
export const BOOKING_TEMPLATES = [
  'REQUESTED',
  'ACCEPTED',
  'DECLINED',
  'EXPIRED',
  'SIGNED',
  'PAID',
  'CANCELLED',
  'HANDED_OVER',
  'RECEIVED',
  'RETURNED',
  'RECEIVED_BACK',
  'ALL_FINE',
  'DAMAGE_REPORTED',
  'DAMAGE_ACCEPTED',
  'DISPUTE_OPENED',
  'DISPUTE_RESOLVED',
] as const;

export type BookingTemplate = (typeof BOOKING_TEMPLATES)[number];

export type Recipient = 'RENTER' | 'OWNER' | 'ADMINS';

/**
 * What the API has to do after a decision, in one transaction (plan 8). Effects are data: the core
 * describes them and never performs them.
 */
export type Effect =
  | { readonly kind: 'LEDGER'; readonly operation: LedgerOperation }
  | { readonly kind: 'SCHEDULE'; readonly timer: TimerKind; readonly at: Date }
  | { readonly kind: 'CANCEL_TIMER'; readonly timer: TimerKind }
  | { readonly kind: 'RESERVE_DATES' }
  | { readonly kind: 'RELEASE_DATES' }
  | { readonly kind: 'GENERATE_CONTRACT' }
  | { readonly kind: 'NOTIFY'; readonly to: Recipient; readonly template: BookingTemplate }
  | { readonly kind: 'SYSTEM_MESSAGE'; readonly template: BookingTemplate };

export interface Decision {
  readonly next: BookingSnapshot;
  readonly effects: Effect[];
}

export interface DecideContext {
  readonly now: Date;
  readonly settings: BookingSettings;
  /** Periods taken by other bookings and the owner's closed days; needed to ACCEPT. */
  readonly blocked?: readonly Period[];
  /** The renter's wallet balance; needed to PAY from the wallet. */
  readonly walletAvailableCents?: Cents;
}
