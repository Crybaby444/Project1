import { describe, expect, it } from 'vitest';
import { DOMAIN_ERROR_CODES, DomainError } from './errors';

describe('DomainError', () => {
  it('is an Error with a stable code and the details that explain it', () => {
    const error = new DomainError('INVALID_AMOUNT', { value: -1 });

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(DomainError);
    expect(error.name).toBe('DomainError');
    expect(error.code).toBe('INVALID_AMOUNT');
    expect(error.details).toEqual({ value: -1 });
    expect(error.message).toBe('INVALID_AMOUNT {"value":-1}');
  });

  it('needs no details', () => {
    const error = new DomainError('NOT_A_PARTY');

    expect(error.details).toBeUndefined();
    expect(error.message).toBe('NOT_A_PARTY');
  });
});

describe('DOMAIN_ERROR_CODES', () => {
  it('is the closed list of codes the API translates to HTTP', () => {
    expect(DOMAIN_ERROR_CODES).toEqual([
      'INVALID_AMOUNT',
      'INVALID_PERCENT',
      'INVALID_DATE',
      'INVALID_PERIOD',
      'START_IN_PAST',
      'TOO_FAR_AHEAD',
      'PERIOD_TOO_SHORT',
      'PERIOD_TOO_LONG',
      'DATES_UNAVAILABLE',
      'INVALID_PRICING',
      'INVALID_OFFER',
      'CANNOT_RENT_OWN',
      'INSUFFICIENT_FUNDS',
      'UNBALANCED_OPERATION',
      'NEGATIVE_BALANCE',
      'NOT_A_PARTY',
      'TRANSITION_NOT_ALLOWED',
      'CONTRACT_NOT_SIGNED',
      'INVALID_INPUT',
    ]);
  });
});
