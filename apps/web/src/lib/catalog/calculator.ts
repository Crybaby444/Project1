import {
  cents,
  DomainError,
  firstConflict,
  localDate,
  period,
  quote,
  validateRentalPeriod,
  daysIn,
  type Period,
  type Quote,
} from '@yoyo/domain';
import type { AvailableItem } from '@yoyo/shared';

/** Why a choice of days cannot be booked; the same codes the API answers with. */
export type PriceProblem = 'START_IN_PAST' | 'TOO_FAR_AHEAD' | 'PERIOD_TOO_SHORT' | 'PERIOD_TOO_LONG' | 'DATES_UNAVAILABLE' | 'INVALID_PERIOD';

export type PriceResult = { ok: true; quote: Quote; days: number } | { ok: false; problem: PriceProblem; days: number };

const PROBLEMS: readonly string[] = ['START_IN_PAST', 'TOO_FAR_AHEAD', 'PERIOD_TOO_SHORT', 'PERIOD_TOO_LONG', 'INVALID_PERIOD'];

/**
 * What renting the item from `start` to `end` costs, checked by the same rules the API uses
 * (@yoyo/domain): when it may start, how long it may last, the taken days, then the quote with the
 * weekly discount and the service fee. No request: the item page has everything it needs.
 */
export function priceFor(item: Pick<AvailableItem, 'listing' | 'blocked' | 'booking'>, start: string, end: string): PriceResult {
  const { listing, booking } = item;
  const pricing = {
    dailyCents: cents(listing.dailyCents ?? 0),
    weeklyDiscountPercent: listing.weeklyDiscountPercent,
    depositCents: cents(listing.depositCents),
    minDays: listing.minDays,
    maxDays: listing.maxDays,
  };
  let p: Period;
  try {
    p = period(localDate(start), localDate(end));
  } catch {
    return { ok: false, problem: 'INVALID_PERIOD', days: 0 };
  }
  const days = daysIn(p);
  try {
    validateRentalPeriod(p, { today: localDate(booking.today), minDays: listing.minDays, maxDays: listing.maxDays, maxAdvanceDays: booking.maxAdvanceDays });
    const blocked = item.blocked.map((b) => period(localDate(b.start), localDate(b.end)));
    if (firstConflict(p, blocked) !== null) return { ok: false, problem: 'DATES_UNAVAILABLE', days };
    return { ok: true, quote: quote({ pricing, days, servicePercent: booking.servicePercent }), days };
  } catch (error) {
    if (error instanceof DomainError && PROBLEMS.includes(error.code)) return { ok: false, problem: error.code as PriceProblem, days };
    throw error;
  }
}
