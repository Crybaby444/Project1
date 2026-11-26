/** Who a deal email speaks to: `deal.<TEMPLATE>.<role>` in the translations. */
export type DealRole = 'renter' | 'owner' | 'admins';

export function dealRole(to: 'RENTER' | 'OWNER' | 'ADMINS'): DealRole {
  return to === 'RENTER' ? 'renter' : to === 'OWNER' ? 'owner' : 'admins';
}

/** Values a deal email's texts may use. */
export const DEAL_PLACEHOLDERS = ['title', 'start', 'end', 'total', 'rent', 'deposit', 'other', 'price'] as const;

export type DealValues = Record<(typeof DEAL_PLACEHOLDERS)[number], string>;

/**
 * Reminders the timers send (not steps of the deal): the day before the handover and before the return, to
 * both people; and when a request or a booking is about to expire, to whoever's turn it is: the owner to
 * answer or to countersign, the renter to sign and pay; and, three days after a deal is completed, to the
 * sides that have not reviewed it.
 */
export const REMINDER_TEMPLATES = ['REMINDER_START', 'REMINDER_END', 'REMINDER_ANSWER', 'REMINDER_SIGN', 'REMINDER_PAY', 'REMINDER_REVIEW'] as const;

export type ReminderTemplate = (typeof REMINDER_TEMPLATES)[number];

/** Emails about price offers, next to the domain's BOOKING_TEMPLATES. */
export const OFFER_TEMPLATES = ['OFFER_MADE', 'OFFER_ACCEPTED', 'OFFER_DECLINED'] as const;
