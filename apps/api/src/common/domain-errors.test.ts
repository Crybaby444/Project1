import { DomainError } from '@yoyo/domain';
import { describe, expect, it } from 'vitest';
import { fromDomainError } from './domain-errors';

describe('fromDomainError', () => {
  it('turns rule refusals into the API error contract', () => {
    expect(fromDomainError(new DomainError('DATES_UNAVAILABLE', { conflict: { start: '2027-01-01' } }))).toMatchObject({
      code: 'DATES_UNAVAILABLE',
      status: 409,
      details: { conflict: { start: '2027-01-01' } },
    });
    expect(fromDomainError(new DomainError('INSUFFICIENT_FUNDS', { account: 'wallet:u', availableCents: 5, shortfallCents: 7 }))).toMatchObject({
      code: 'INSUFFICIENT_FUNDS',
      status: 409,
      details: { shortfallCents: 7 },
    });
    expect(fromDomainError(new DomainError('NOT_A_PARTY'))).toMatchObject({ code: 'NOT_FOUND', status: 404 });
    expect(fromDomainError(new DomainError('TRANSITION_NOT_ALLOWED', { why: 'x', status: 'PAID' }))).toMatchObject({
      code: 'ACTION_NOT_ALLOWED',
      status: 409,
      details: { why: 'x', status: 'PAID' },
    });
    expect(fromDomainError(new DomainError('CANNOT_RENT_OWN'))).toMatchObject({ code: 'CANNOT_RENT_OWN', status: 409 });
    expect(fromDomainError(new DomainError('CONTRACT_NOT_SIGNED'))).toMatchObject({ code: 'CONTRACT_NOT_SIGNED', status: 409 });
  });

  it('names the field of invalid input', () => {
    expect(fromDomainError(new DomainError('START_IN_PAST'))).toMatchObject({
      code: 'VALIDATION_FAILED',
      status: 400,
      fields: { start: expect.any(String) },
      details: { reason: 'START_IN_PAST' },
    });
    expect(fromDomainError(new DomainError('PERIOD_TOO_LONG', { days: 40, maxDays: 30 })).fields).toEqual({ end: expect.any(String) });
    expect(fromDomainError(new DomainError('INVALID_OFFER')).fields).toEqual({ dailyCents: expect.any(String) });
    expect(fromDomainError(new DomainError('INVALID_INPUT', { field: 'event.reason' })).fields).toEqual({ 'event.reason': expect.any(String) });
  });

  it('treats broken money rules as a bug of ours: 500', () => {
    for (const code of ['UNBALANCED_OPERATION', 'NEGATIVE_BALANCE', 'INVALID_PRICING'] as const) {
      expect(fromDomainError(new DomainError(code))).toMatchObject({ code: 'INTERNAL', status: 500 });
    }
  });
});
