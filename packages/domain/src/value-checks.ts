/**
 * Checks that grow with what is at stake (audit 2026-11-16, D4; Fat Llama asks for more as the item's value
 * grows). A deal is high-value from a €300 deposit or €500 of rent; then the renter must have confirmed
 * both their phone and who they are, whatever the site-wide identity setting says.
 */
export const HIGH_VALUE = { depositCents: 30_000, rentCents: 50_000 } as const;

export type DealCheck = 'PHONE' | 'IDENTITY';

/** The two thresholds; the platform settings set them (`highValueDepositCents`, `highValueRentCents`). */
export interface HighValueThresholds {
  readonly depositCents: number;
  readonly rentCents: number;
}

export function isHighValue(deal: { depositCents: number; rentCents: number }, at: HighValueThresholds = HIGH_VALUE): boolean {
  return deal.depositCents >= at.depositCents || deal.rentCents >= at.rentCents;
}

/** What the renter still has to confirm before asking for this deal, in the order to do it. */
export function missingForDeal(
  deal: { depositCents: number; rentCents: number },
  renter: { phoneVerified: boolean; identityVerified: boolean },
  at: HighValueThresholds = HIGH_VALUE,
): DealCheck[] {
  if (!isHighValue(deal, at)) return [];
  const missing: DealCheck[] = [];
  if (!renter.phoneVerified) missing.push('PHONE');
  if (!renter.identityVerified) missing.push('IDENTITY');
  return missing;
}
