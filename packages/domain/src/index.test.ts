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
      ].sort(),
    );
  });
});
