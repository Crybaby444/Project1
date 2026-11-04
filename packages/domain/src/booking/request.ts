import { daysIn, firstConflict, localDateIn, validateRentalPeriod } from '../dates';
import type { Period } from '../dates';
import { DomainError } from '../errors';
import { requireId } from '../ids';
import type { Cents } from '../money';
import { quote, validateOffer } from '../pricing';
import type { ListingPricing } from '../pricing';
import { ttl } from './transitions';
import type { BookingSnapshot, DecideContext, Decision } from './types';

export interface RequestInput {
  readonly id: string;
  readonly listingId: string;
  readonly renterId: string;
  readonly ownerId: string;
  readonly period: Period;
  /** The item's time zone. */
  readonly timeZone: string;
  readonly pricing: ListingPricing;
  /** The daily price of an accepted offer (spec §4.6). */
  readonly agreedDailyCents?: Cents;
  /** Periods taken by other bookings and the owner's closed days. */
  readonly blocked: readonly Period[];
}

/**
 * Step 1 of a deal: the renter asks for dates. Checks that the renter is not the owner, that the
 * period starts between today (in the item's time zone) and `maxAdvanceDays` ahead and fits the
 * listing's length limits, that the dates are free, and that an agreed price is below the listed one;
 * then prices the rental. The owner has `requestTtlHours` to answer, but no longer than the end of
 * the first rental day.
 */
export function createRequest(input: RequestInput, ctx: DecideContext): Decision {
  for (const field of ['id', 'listingId', 'renterId', 'ownerId'] as const) requireId(input[field], field);
  if (input.renterId === input.ownerId) {
    throw new DomainError('CANNOT_RENT_OWN', { userId: input.renterId });
  }
  validateRentalPeriod(input.period, {
    today: localDateIn(ctx.now, input.timeZone),
    minDays: input.pricing.minDays,
    maxDays: input.pricing.maxDays,
    maxAdvanceDays: ctx.settings.maxAdvanceDays,
  });
  const conflict = firstConflict(input.period, input.blocked);
  if (conflict !== null) throw new DomainError('DATES_UNAVAILABLE', { conflict });
  if (input.agreedDailyCents !== undefined) validateOffer(input.pricing, input.agreedDailyCents);

  const priced = quote({
    pricing: input.pricing,
    days: daysIn(input.period),
    servicePercent: ctx.settings.servicePercent,
    ...(input.agreedDailyCents === undefined ? {} : { agreedDailyCents: input.agreedDailyCents }),
  });
  const expiresAt = ttl(ctx.now, ctx.settings.requestTtlHours, input);
  const next: BookingSnapshot = {
    id: input.id,
    listingId: input.listingId,
    renterId: input.renterId,
    ownerId: input.ownerId,
    status: 'REQUESTED',
    period: input.period,
    timeZone: input.timeZone,
    quote: priced,
    timers: { REQUEST_EXPIRY: expiresAt },
    createdAt: ctx.now,
    updatedAt: ctx.now,
  };
  return {
    next,
    effects: [
      { kind: 'SCHEDULE', timer: 'REQUEST_EXPIRY', at: expiresAt },
      { kind: 'NOTIFY', to: 'OWNER', template: 'REQUESTED' },
      { kind: 'SYSTEM_MESSAGE', template: 'REQUESTED' },
    ],
  };
}
