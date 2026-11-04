import { DomainError } from './errors';
import { add, cents, mulInt, percentOf, sub } from './money';
import type { Cents } from './money';

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

/** What a rental costs, split into the parts each side sees. All amounts are whole cents. */
export interface Quote {
  readonly days: number;
  /** The daily price used: the agreed one when an offer was accepted, the listing's otherwise. */
  readonly dailyCents: Cents;
  /** `dailyCents × days`. */
  readonly baseCents: Cents;
  /** The weekly discount actually applied, 0 when it does not apply. */
  readonly discountPercent: number;
  readonly discountCents: Cents;
  /** `base − discount`: the price of the rental itself. */
  readonly rentCents: Cents;
  /** Yoyo's fee, paid by the renter on top of the rent. */
  readonly serviceFeeCents: Cents;
  readonly depositCents: Cents;
  /** `rent + fee + deposit`: what the renter pays. */
  readonly totalCents: Cents;
  /** What the owner receives: the rent. */
  readonly ownerPayoutCents: Cents;
}

export interface QuoteInput {
  readonly pricing: ListingPricing;
  readonly days: number;
  readonly servicePercent: number;
  /** A daily price agreed through an accepted offer. It is final: no weekly discount on top. */
  readonly agreedDailyCents?: Cents;
}

/**
 * Prices a rental. The discount and the fee are taken from the sums for the whole period and
 * rounded once each, so the total is always exactly the sum of its parts.
 */
export function quote({ pricing, days, servicePercent, agreedDailyCents }: QuoteInput): Quote {
  if (!Number.isSafeInteger(days)) {
    throw new DomainError('INVALID_INPUT', { field: 'days', value: days });
  }
  if (days < pricing.minDays) {
    throw new DomainError('PERIOD_TOO_SHORT', { days, minDays: pricing.minDays });
  }
  if (days > pricing.maxDays) {
    throw new DomainError('PERIOD_TOO_LONG', { days, maxDays: pricing.maxDays });
  }
  const dailyCents = cents(agreedDailyCents ?? pricing.dailyCents);
  const baseCents = mulInt(dailyCents, days);
  const discountPercent =
    agreedDailyCents === undefined && days >= WEEKLY_DISCOUNT_FROM_DAYS ? pricing.weeklyDiscountPercent : 0;
  const discountCents = percentOf(baseCents, discountPercent);
  const rentCents = sub(baseCents, discountCents);
  const serviceFeeCents = percentOf(rentCents, servicePercent);
  const depositCents = cents(pricing.depositCents);
  return {
    days,
    dailyCents,
    baseCents,
    discountPercent,
    discountCents,
    rentCents,
    serviceFeeCents,
    depositCents,
    totalCents: add(rentCents, serviceFeeCents, depositCents),
    ownerPayoutCents: rentCents,
  };
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
