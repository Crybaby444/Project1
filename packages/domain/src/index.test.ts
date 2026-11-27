import { describe, expect, it } from 'vitest';
import * as domain from './index';

describe('@yoyo/domain entry point', () => {
  it('exports the whole public API, and nothing else', () => {
    expect(Object.keys(domain).sort()).toEqual(
      [
        // errors
        'DOMAIN_ERROR_CODES',
        'DomainError',
        // money
        'add',
        'cents',
        'formatMoney',
        'mulInt',
        'percentOf',
        'sub',
        // dates
        'DEFAULT_TIME_ZONE',
        'addDays',
        'compareDates',
        'daysIn',
        'diffDays',
        'endOfDayIn',
        'firstConflict',
        'localDate',
        'localDateIn',
        'overlaps',
        'period',
        'validateRentalPeriod',
        // pricing and settings
        'PRICING_LIMITS',
        'WEEKLY_DISCOUNT_FROM_DAYS',
        'OFFER_FLOOR_PERCENT',
        'offerFloorCents',
        'quote',
        'validateOffer',
        'validatePricing',
        'DEFAULT_BOOKING_SETTINGS',
        'serviceFeeAt',
        'validateBookingSettings',
        'welcomeFeeEnds',
        // cancellation
        'CANCELLATION_POLICIES',
        'rentRefundPercent',
        // value checks
        'HIGH_VALUE',
        'isHighValue',
        'missingForDeal',
        // ledger
        'applyOperation',
        'assertBalanced',
        'bookingPartialRefund',
        'bookingPayment',
        'bookingRefund',
        'depositRefund',
        'depositToOwner',
        'rentRelease',
        'topUp',
        'withdraw',
        // booking
        'BOOKING_STATUSES',
        'BOOKING_TEMPLATES',
        'TERMINAL_STATUSES',
        'TIMER_KINDS',
        'createRequest',
        'decide',
        'isTerminal',
        'availableActions',
        // reviews
        'canReview',
      'reviewDeadline',
      'reviewIsPublic',
      ].sort(),
    );
  });
});
