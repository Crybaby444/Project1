import { describe, expect, it } from 'vitest';
import { ApiError, toApiError } from './api-error';

function response(status: number, headers: Record<string, string> = {}): Response {
  return new Response(null, { status, headers });
}

describe('toApiError', () => {
  it('reads the code, the status and the Retry-After seconds of a rate limit', () => {
    const error = toApiError(response(429, { 'Retry-After': '42' }), {
      error: { code: 'RATE_LIMITED', message: 'Too many attempts, try again later' },
    });

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: 'RATE_LIMITED', status: 429, retryAfterSeconds: 42 });
    expect(error.message).toBe('Too many attempts, try again later');
  });

  it('keeps the per-field messages of a validation error', () => {
    const error = toApiError(response(400), {
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Some fields are invalid',
        fields: { email: 'Invalid email' },
      },
    });
    expect(error).toMatchObject({
      code: 'VALIDATION_FAILED',
      status: 400,
      fields: { email: 'Invalid email' },
    });
    expect(error.retryAfterSeconds).toBeUndefined();
  });

  it('keeps the details the screens act on (the current version, the builder steps)', () => {
    const error = toApiError(response(400), {
      error: {
        code: 'LISTING_INCOMPLETE',
        message: 'x',
        fields: { photos: 'Add one' },
        details: { steps: ['photos'] },
      },
    });
    expect(error.details).toEqual({ steps: ['photos'] });
  });

  it('falls back to INTERNAL for a body that is not an API error (an HTML 502 from a proxy)', () => {
    expect(toApiError(response(502), '<html>Bad gateway</html>')).toMatchObject({
      code: 'INTERNAL',
      status: 502,
    });
    expect(toApiError(response(500), { error: { code: 'NOPE', message: 'x' } })).toMatchObject({
      code: 'INTERNAL',
    });
  });

  it('ignores a Retry-After that is not a whole number of seconds', () => {
    const error = toApiError(response(429, { 'Retry-After': 'soon' }), {
      error: { code: 'RATE_LIMITED', message: 'x' },
    });
    expect(error.retryAfterSeconds).toBeUndefined();
  });
});

describe('ApiError.network', () => {
  it('stands for "the API could not be reached", with status 0', () => {
    expect(ApiError.network()).toMatchObject({ code: 'NETWORK', status: 0 });
  });
});
