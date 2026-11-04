import { z } from 'zod';

/**
 * Every error code the API answers with. The web app (and later the mobile apps) branch on these,
 * so removing or renaming one is a breaking change.
 */
export const ERROR_CODES = [
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
  /** Google sign-in: the person cancelled on Google's screen. */
  'OAUTH_CANCELLED',
  /** Google sign-in: the attempt expired, or was started in another browser or tab. */
  'OAUTH_STATE_INVALID',
  /** Google sign-in: Google refused or could not be reached. */
  'OAUTH_FAILED',
  'ORIGIN_FORBIDDEN',
  'NOT_FOUND',
  'INTERNAL',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export function isErrorCode(value: string): value is ErrorCode {
  return (ERROR_CODES as readonly string[]).includes(value);
}

/** Body of every error response: `{ error: { code, message, fields? } }`. */
export const ApiErrorBodySchema = z.object({
  error: z.object({
    code: z.enum(ERROR_CODES),
    /** Human-readable English text for logs and developers; UIs translate by `code`. */
    message: z.string(),
    /** Per-field messages for invalid input, keyed by the field path (`email`, `address.city`). */
    fields: z.record(z.string(), z.string()).optional(),
  }),
});

export type ApiErrorBody = z.infer<typeof ApiErrorBodySchema>;
