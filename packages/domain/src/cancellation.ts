/**
 * Cancellation policies (owner, 2026-11-16, after Hygglo: the owner picks one per item). What a renter
 * gets back of the rent when they cancel a paid deal, by whole days before the first rental day. The
 * deposit and the service fee always come back; an owner who cancels gives everything back.
 *
 *   FLEXIBLE  all of the rent until the start (Yoyo's rule before policies existed)
 *   MODERATE  all of it 5 days or more before, half after that
 *   STRICT    all of it 14 days or more before, half from 7 days, nothing in the last 6 days
 */
export const CANCELLATION_POLICIES = ['FLEXIBLE', 'MODERATE', 'STRICT'] as const;
export type CancellationPolicy = (typeof CANCELLATION_POLICIES)[number];

export function rentRefundPercent(policy: CancellationPolicy, daysBeforeStart: number): 100 | 50 | 0 {
  switch (policy) {
    case 'FLEXIBLE':
      return 100;
    case 'MODERATE':
      return daysBeforeStart >= 5 ? 100 : 50;
    case 'STRICT':
      return daysBeforeStart >= 14 ? 100 : daysBeforeStart >= 7 ? 50 : 0;
  }
}
