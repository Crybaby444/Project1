import { describe, expect, it } from 'vitest';
import { ApiErrorBodySchema, ERROR_CODES, isErrorCode } from './errors';

describe('ERROR_CODES', () => {
  it('is the error contract the web app and the API share', () => {
    expect([...ERROR_CODES].sort()).toEqual(
      [
        'VALIDATION_FAILED',
        'AUTH_INVALID_CREDENTIALS',
        'AUTH_EMAIL_TAKEN',
        'AUTH_UNAUTHENTICATED',
        'AUTH_FORBIDDEN',
        'AUTH_BLOCKED',
        'AUTH_PROVIDER_DISABLED',
        'TOKEN_EXPIRED',
        'TOKEN_USED',
        'RATE_LIMITED',
        'ORIGIN_FORBIDDEN',
        'NOT_FOUND',
        'INTERNAL',
        'INVALID_STATUS',
        'UNSUPPORTED_MEDIA',
        'PAYLOAD_TOO_LARGE',
        'PHOTO_LIMIT',
        'STORAGE_DISABLED',
        'LISTING_INCOMPLETE',
      ].sort(),
    );
  });

  it('recognises only exact codes', () => {
    expect(isErrorCode('TOKEN_USED')).toBe(true);
    expect(isErrorCode('token_used')).toBe(false);
    expect(isErrorCode('SOMETHING_ELSE')).toBe(false);
  });
});

describe('ApiErrorBodySchema', () => {
  it('accepts an error with and without field messages', () => {
    expect(ApiErrorBodySchema.parse({ error: { code: 'NOT_FOUND', message: 'Not found' } })).toEqual({
      error: { code: 'NOT_FOUND', message: 'Not found' },
    });
    expect(
      ApiErrorBodySchema.safeParse({
        error: { code: 'VALIDATION_FAILED', message: 'Check the fields', fields: { email: 'Invalid email' } },
      }).success,
    ).toBe(true);
  });

  it('may carry machine-readable details, such as the current version of a listing', () => {
    const body = { error: { code: 'INVALID_STATUS', message: 'Changed elsewhere', details: { currentVersion: 4 } } };
    expect(ApiErrorBodySchema.parse(body)).toEqual(body);
  });

  it('rejects unknown codes and non-string field messages', () => {
    expect(ApiErrorBodySchema.safeParse({ error: { code: 'OOPS', message: 'x' } }).success).toBe(false);
    expect(
      ApiErrorBodySchema.safeParse({ error: { code: 'VALIDATION_FAILED', message: 'x', fields: { email: 1 } } })
        .success,
    ).toBe(false);
  });
});
