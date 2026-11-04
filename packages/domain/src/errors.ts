/**
 * Every reason the domain can refuse an operation. The list is closed: the API translates each code
 * into an HTTP status and a translated message (plan 8), so a new code is an API change.
 */
export const DOMAIN_ERROR_CODES = [
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
] as const;

export type DomainErrorCode = (typeof DOMAIN_ERROR_CODES)[number];

/** A business rule refused the operation. `code` is stable; `details` say which value broke which rule. */
export class DomainError extends Error {
  override readonly name = 'DomainError';
  readonly code: DomainErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(code: DomainErrorCode, details?: Record<string, unknown>) {
    super(details === undefined ? code : `${code} ${JSON.stringify(details)}`);
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}
