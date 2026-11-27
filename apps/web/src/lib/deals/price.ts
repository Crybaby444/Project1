import { cents, DEFAULT_BOOKING_SETTINGS, DomainError, quote as priceDays, serviceFeeAt, type LocalDate } from '@yoyo/domain';
import type { BookingTerms, QuoteView } from '@yoyo/shared';
import { crossesTaken, type Range } from '@/components/deals/DateRangePicker';
import { daysBetween } from './dates';

export type RangeProblem = 'tooShort' | 'tooLong' | 'crossesTaken' | null;

/**
 * The fee a request sent now would pay: the terms' (a visitor's) unless the signed-in renter is within their
 * first fee-free days (owner, 2026-11-26), worked out with the domain's own rule, as the API will.
 */
export function feeFor(terms: BookingTerms, renterJoinedAt: string | null, now: Date = new Date()): { percent: number; promoUntil: LocalDate | null } {
  if (!renterJoinedAt || !terms.welcomeFeeDays) return { percent: terms.servicePercent, promoUntil: terms.servicePromoUntil as LocalDate | null };
  const settings = { ...DEFAULT_BOOKING_SETTINGS, servicePercent: terms.regularServicePercent, welcomeFeeDays: terms.welcomeFeeDays };
  return serviceFeeAt(settings, now, terms.timeZone, new Date(renterJoinedAt));
}

/**
 * The price of a picked range with the domain's own `quote` (the same rules the API uses), or why the
 * range does not work. With an agreed daily price (an accepted offer, or one being written), the renter
 * pays whichever is cheaper, as the API decides. The API's answer to the request is the final word.
 */
export function priceRange(
  terms: BookingTerms,
  range: Range | null,
  renterJoinedAt: string | null = null,
  agreedDailyCents?: number,
): { quote: QuoteView | null; problem: RangeProblem } {
  if (!range?.end) return { quote: null, problem: null };
  const fee = feeFor(terms, renterJoinedAt);
  if (crossesTaken(terms.blocked, range.start, range.end)) return { quote: null, problem: 'crossesTaken' };
  const days = daysBetween(range.start, range.end);
  try {
    const q = priceDays({
      pricing: { ...terms.pricing, dailyCents: cents(terms.pricing.dailyCents), depositCents: cents(terms.pricing.depositCents) },
      days,
      servicePercent: fee.percent,
      servicePromoUntil: fee.promoUntil,
      ...(agreedDailyCents !== undefined && { agreedDailyCents: cents(agreedDailyCents) }),
    });
    return { quote: { ...q }, problem: null };
  } catch (error) {
    if (error instanceof DomainError && error.code === 'PERIOD_TOO_SHORT') return { quote: null, problem: 'tooShort' };
    if (error instanceof DomainError && error.code === 'PERIOD_TOO_LONG') return { quote: null, problem: 'tooLong' };
    throw error;
  }
}
