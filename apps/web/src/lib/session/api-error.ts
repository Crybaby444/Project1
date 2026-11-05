import { ApiErrorBodySchema, type ErrorCode } from '@yoyo/shared';

/** `NETWORK`: the API could not be reached at all (offline, DNS, CORS, aborted). */
export type ApiErrorCode = ErrorCode | 'NETWORK';

/**
 * A failed API call as the screens see it. The UI picks its text from `errors.<code>`;
 * `message` is the API's English text, for logs only.
 */
export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    readonly status: number,
    message: string = code,
    readonly fields?: Record<string, string>,
    readonly retryAfterSeconds?: number,
    /** Machine-readable facts: `currentVersion` of a stale listing edit, `steps` of LISTING_INCOMPLETE. */
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static network(): ApiError {
    return new ApiError('NETWORK', 0, 'The API could not be reached');
  }
}

/** Whole seconds from a `Retry-After: 42` header; dates and junk are ignored. */
function retryAfter(response: Response): number | undefined {
  const value = response.headers.get('retry-after')?.trim();
  return value && /^\d+$/.test(value) ? Number(value) : undefined;
}

/** Turns an error response and its parsed body (`{ error: { code, message, fields? } }`) into an ApiError. */
export function toApiError(response: Response, body: unknown): ApiError {
  const parsed = ApiErrorBodySchema.safeParse(body);
  if (!parsed.success)
    return new ApiError('INTERNAL', response.status, `Unexpected ${response.status} answer`);
  const { code, message, fields, details } = parsed.data.error;
  return new ApiError(code, response.status, message, fields, retryAfter(response), details);
}

/**
 * Unwraps an openapi-fetch result: the data on success, an ApiError otherwise.
 * A thrown fetch (no answer at all) becomes ApiError.network().
 */
export async function unwrap<T>(
  call: Promise<{ data?: T; error?: unknown; response: Response }>,
): Promise<T> {
  let result: Awaited<typeof call>;
  try {
    result = await call;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.network();
  }
  if (!result.response.ok) throw toApiError(result.response, result.error);
  return result.data as T;
}
