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
  /** The listing is not in a status that allows this, or it changed elsewhere (`details.currentVersion`). */
  'INVALID_STATUS',
  /** The file is not a JPEG, PNG or WebP (checked by its bytes, not by its Content-Type). */
  'UNSUPPORTED_MEDIA',
  /** The upload is over the size limit (10 MB, or too many pixels). */
  'PAYLOAD_TOO_LARGE',
  /** The listing already has its 8 photos. */
  'PHOTO_LIMIT',
  /** Photo storage is not configured (or not reachable) on this deployment. */
  'STORAGE_DISABLED',
  /** The listing cannot go to review yet: `fields` says what is missing, `details.steps` in which builder steps. */
  'LISTING_INCOMPLETE',
  /** Address search is unavailable right now (Nominatim down, or its queue is full). */
  'GEO_UNAVAILABLE',
  /** Some of the days are taken by another booking or closed by the owner (`details.conflict`). */
  'DATES_UNAVAILABLE',
  /** Nobody rents their own item. */
  'CANNOT_RENT_OWN',
  /** The listing cannot be booked now: not published, or its owner is blocked or gone. */
  'LISTING_UNAVAILABLE',
  /** The wallet does not hold enough (`details.shortfallCents`). */
  'INSUFFICIENT_FUNDS',
  /** The card was declined (`details.declineCode`: card_declined, insufficient_funds, expired_card…). */
  'PAYMENT_DECLINED',
  /** Both sides sign the contract before the renter pays. */
  'CONTRACT_NOT_SIGNED',
  /** The deal's rules do not allow this step now (`details.why`); `actions` of the booking say what is. */
  'ACTION_NOT_ALLOWED',
  /** A deadline of the deal passed first; the deal moved on (`details.status`). Reload it. */
  'DEADLINE_PASSED',
  /** This request moves money: send an Idempotency-Key header. */
  'IDEMPOTENCY_KEY_REQUIRED',
  /** This Idempotency-Key was already used for a different request. */
  'IDEMPOTENCY_KEY_REUSED',
  /** A request with this Idempotency-Key is still being handled; retry in a moment. */
  'IDEMPOTENCY_IN_PROGRESS',
  /** The price offer is not open (answered, expired, used, or for other days). */
  'OFFER_UNAVAILABLE',
  /** Over a wallet limit (top-up amount or balance). */
  'WALLET_LIMIT',
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
    /** Machine-readable facts about the error, e.g. `{ currentVersion: 4 }` for a stale listing edit. */
    details: z.record(z.string(), z.unknown()).optional(),
  }),
});

export type ApiErrorBody = z.infer<typeof ApiErrorBodySchema>;
