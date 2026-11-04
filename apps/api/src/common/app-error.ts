import type { ErrorCode } from '@yoyo/shared';

const DEFAULT_MESSAGES: Record<ErrorCode, string> = {
  VALIDATION_FAILED: 'Some fields are invalid',
  AUTH_INVALID_CREDENTIALS: 'Wrong email or password',
  AUTH_EMAIL_TAKEN: 'This email is already registered',
  AUTH_UNAUTHENTICATED: 'Sign in to continue',
  AUTH_FORBIDDEN: 'You do not have access to this',
  AUTH_BLOCKED: 'This account is blocked',
  AUTH_PROVIDER_DISABLED: 'This sign-in method is not available',
  TOKEN_EXPIRED: 'This link or code has expired',
  TOKEN_USED: 'This link or code has already been used',
  RATE_LIMITED: 'Too many attempts, try again later',
  ORIGIN_FORBIDDEN: 'Requests from this origin are not allowed',
  NOT_FOUND: 'Not found',
  INTERNAL: 'Something went wrong on our side',
  INVALID_STATUS: 'This is not possible in the current status',
};

/** An expected failure with a stable code; ErrorFilter turns it into the uniform error body. */
export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly status: number,
    message?: string,
    readonly fields?: Record<string, string>,
    readonly details?: Record<string, unknown>,
  ) {
    super(message ?? DEFAULT_MESSAGES[code]);
    this.name = 'AppError';
  }
}

/** 429 RATE_LIMITED; the client may retry after `retryAfterSeconds` (sent as the Retry-After header). */
export class RateLimitedError extends AppError {
  constructor(readonly retryAfterSeconds: number) {
    super('RATE_LIMITED', 429);
    this.name = 'RateLimitedError';
  }
}
