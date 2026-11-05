/** Who a deal email speaks to: `deal.<TEMPLATE>.<role>` in the translations. */
export type DealRole = 'renter' | 'owner' | 'admins';

export function dealRole(to: 'RENTER' | 'OWNER' | 'ADMINS'): DealRole {
  return to === 'RENTER' ? 'renter' : to === 'OWNER' ? 'owner' : 'admins';
}

/** Values a deal email's texts may use. */
export const DEAL_PLACEHOLDERS = ['title', 'start', 'end', 'total', 'rent', 'deposit', 'other', 'price'] as const;

export type DealValues = Record<(typeof DEAL_PLACEHOLDERS)[number], string>;

/** Emails about price offers, next to the domain's BOOKING_TEMPLATES. */
export const OFFER_TEMPLATES = ['OFFER_MADE', 'OFFER_ACCEPTED', 'OFFER_DECLINED'] as const;
