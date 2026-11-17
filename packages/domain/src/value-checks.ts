/**
 * Checks that grow with what is at stake (audit 2026-11-16, D4; Fat Llama asks for more as the item's value
 * grows). A deal is high-value from a €300 deposit or €500 of rent; then the renter must have confirmed
 * both their phone and who they are, whatever the site-wide identity setting says.
 */
export const HIGH_VALUE = { depositCents: 30_000, rentCents: 50_000 } as const;

export type DealCheck = 'PHONE' | 'IDENTITY';

export function isHighValue(deal: { depositCents: number; rentCents: number }): boolean {
  return deal.depositCents >= HIGH_VALUE.depositCents || deal.rentCents >= HIGH_VALUE.rentCents;
}

/** What the renter still has to confirm before asking for this deal, in the order to do it. */
export function missingForDeal(
  deal: { depositCents: number; rentCents: number },
  renter: { phoneVerified: boolean; identityVerified: boolean },
): DealCheck[] {
  if (!isHighValue(deal)) return [];
  const missing: DealCheck[] = [];
  if (!renter.phoneVerified) missing.push('PHONE');
  if (!renter.identityVerified) missing.push('IDENTITY');
  return missing;
}
