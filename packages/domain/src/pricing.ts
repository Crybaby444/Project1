import { DomainError } from './errors';
import { add, cents, mulInt, percentOf, sub } from './money';
import type { Cents } from './money';
import type { LocalDate } from './dates';

/** The price fields of a listing (spec §4.3). */
export interface ListingPricing {
  readonly dailyCents: Cents;
  /** Discount, in whole percent, for rentals of `WEEKLY_DISCOUNT_FROM_DAYS` days or more. */
  readonly weeklyDiscountPercent: number;
  readonly depositCents: Cents;
  readonly minDays: number;
  readonly maxDays: number;
}

/** Bounds every listing's prices stay within; forms can show them before the API refuses a value. */
export const PRICING_LIMITS = {
  dailyCents: { min: 100, max: 1_000_000 },
  weeklyDiscountPercent: { min: 0, max: 90 },
  depositCents: { min: 0, max: 5_000_000 },
  days: { min: 1, max: 365 },
} as const;

/** Rentals of at least this many days get the listing's weekly discount. */
export const WEEKLY_DISCOUNT_FROM_DAYS = 7;

function within(value: number, min: number, max: number): boolean {
  return Number.isSafeInteger(value) && value >= min && value <= max;
}

function invalidPricing(field: keyof ListingPricing, value: number): never {
  throw new DomainError('INVALID_PRICING', { field, value });
}

/** Throws `INVALID_PRICING` naming the first field (in declaration order) that breaks `PRICING_LIMITS`. */
export function validatePricing(p: ListingPricing): void {
  const { dailyCents, weeklyDiscountPercent, depositCents, days } = PRICING_LIMITS;
  if (!within(p.dailyCents, dailyCents.min, dailyCents.max)) invalidPricing('dailyCents', p.dailyCents);
  if (!within(p.weeklyDiscountPercent, weeklyDiscountPercent.min, weeklyDiscountPercent.max)) {
    invalidPricing('weeklyDiscountPercent', p.weeklyDiscountPercent);
  }
  if (!within(p.depositCents, depositCents.min, depositCents.max))
    invalidPricing('depositCents', p.depositCents);
  if (!within(p.minDays, days.min, days.max)) invalidPricing('minDays', p.minDays);
  if (!within(p.maxDays, p.minDays, days.max)) invalidPricing('maxDays', p.maxDays);
}

/** Which price a quote uses: the listing's (with its weekly discount) or an accepted offer's. */
export type PriceSource = 'LISTED' | 'AGREED';

/** What a rental costs, split into the parts each side sees. All amounts are whole cents. */
export interface Quote {
  readonly days: number;
  /** The daily price used: the agreed one or the listing's, whichever `priceSource` says. */
  readonly dailyCents: Cents;
  /** `dailyCents × days`. */
  readonly baseCents: Cents;
  /** The weekly discount actually applied, 0 when it does not apply. */
  readonly discountPercent: number;
  readonly discountCents: Cents;
  /** `base − discount`: the price of the rental itself. */
  readonly rentCents: Cents;
  /** The fee percent applied (frozen into the booking: later setting changes never alter it). */
  readonly servicePercent: number;
  /** Yoyo's fee, paid by the renter on top of the rent. */
  readonly serviceFeeCents: Cents;
  /** When the percent is a launch offer: its last day (see `serviceFeeAt`); null for the regular fee. */
  readonly servicePromoUntil: LocalDate | null;
  readonly depositCents: Cents;
  /** `rent + fee + deposit`: what the renter pays. */
  readonly totalCents: Cents;
  /** What the owner receives: the rent. */
  readonly ownerPayoutCents: Cents;
  readonly priceSource: PriceSource;
}

export interface QuoteInput {
  readonly pricing: ListingPricing;
  readonly days: number;
  readonly servicePercent: number;
  /** The last day of the launch offer the percent comes from, if it does (`serviceFeeAt`). */
  readonly servicePromoUntil?: LocalDate | null;
  /**
   * A daily price agreed through an accepted offer. No weekly discount on top of it; if the listing
   * with its discount is cheaper for the renter, the quote uses the listing instead.
   */
  readonly agreedDailyCents?: Cents;
}

/**
 * Prices a rental. The discount and the fee are taken from the sums for the whole period and
 * rounded once each, so the total is always exactly the sum of its parts. With an agreed price, the
 * renter pays whichever is cheaper: the agreed daily price with no discount, or the listed price with
 * the weekly discount (on a tie, the agreed price).
 */
export function quote({ pricing, days, servicePercent, servicePromoUntil = null, agreedDailyCents }: QuoteInput): Quote {
  if (!Number.isSafeInteger(days)) {
    throw new DomainError('INVALID_INPUT', { field: 'days', value: days });
  }
  if (days < pricing.minDays) {
    throw new DomainError('PERIOD_TOO_SHORT', { days, minDays: pricing.minDays });
  }
  if (days > pricing.maxDays) {
    throw new DomainError('PERIOD_TOO_LONG', { days, maxDays: pricing.maxDays });
  }
  const listed = rentAt(cents(pricing.dailyCents), days, weeklyDiscountFor(pricing, days));
  const agreed = agreedDailyCents === undefined ? undefined : rentAt(cents(agreedDailyCents), days, 0);
  const priceSource: PriceSource =
    agreed !== undefined && agreed.rentCents <= listed.rentCents ? 'AGREED' : 'LISTED';
  const { dailyCents, baseCents, discountPercent, discountCents, rentCents } =
    priceSource === 'AGREED' && agreed !== undefined ? agreed : listed;
  const serviceFeeCents = percentOf(rentCents, servicePercent);
  const depositCents = cents(pricing.depositCents);
  return {
    days,
    dailyCents,
    baseCents,
    discountPercent,
    discountCents,
    rentCents,
    servicePercent,
    serviceFeeCents,
    servicePromoUntil,
    depositCents,
    totalCents: add(rentCents, serviceFeeCents, depositCents),
    ownerPayoutCents: rentCents,
    priceSource,
  };
}

const weeklyDiscountFor = (pricing: ListingPricing, days: number): number =>
  days >= WEEKLY_DISCOUNT_FROM_DAYS ? pricing.weeklyDiscountPercent : 0;

function rentAt(dailyCents: Cents, days: number, discountPercent: number) {
  const baseCents = mulInt(dailyCents, days);
  const discountCents = percentOf(baseCents, discountPercent);
  return { dailyCents, baseCents, discountPercent, discountCents, rentCents: sub(baseCents, discountCents) };
}

/**
 * Checks a renter's daily price offer (spec §4.6): at least `PRICING_LIMITS.dailyCents.min` and below
 * the listed price. Offering the listed price or more makes no sense.
 */
export function validateOffer(pricing: ListingPricing, offerDailyCents: Cents): void {
  if (!within(offerDailyCents, PRICING_LIMITS.dailyCents.min, pricing.dailyCents - 1)) {
    throw new DomainError('INVALID_OFFER', { offerDailyCents, dailyCents: pricing.dailyCents });
  }
}
