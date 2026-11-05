import { DomainError, type DomainErrorCode } from '@yoyo/domain';
import { AppError } from './app-error';

/** Rule refusals that are about one input field, and that field when the error does not name it. */
const FIELD_OF: Partial<Record<DomainErrorCode, string>> = {
  INVALID_DATE: 'start',
  START_IN_PAST: 'start',
  TOO_FAR_AHEAD: 'start',
  INVALID_PERIOD: 'end',
  PERIOD_TOO_SHORT: 'end',
  PERIOD_TOO_LONG: 'end',
  INVALID_OFFER: 'dailyCents',
  INVALID_AMOUNT: 'amountCents',
  INVALID_PERCENT: 'percent',
  INVALID_INPUT: 'input',
};

const MESSAGES: Partial<Record<DomainErrorCode, string>> = {
  INVALID_DATE: 'No such day',
  START_IN_PAST: 'The rental cannot start in the past',
  TOO_FAR_AHEAD: 'The rental starts too far ahead',
  INVALID_PERIOD: 'The rental ends before it starts',
  PERIOD_TOO_SHORT: 'Shorter than the owner allows',
  PERIOD_TOO_LONG: 'Longer than the owner allows',
  INVALID_OFFER: 'Offer at least €1 a day and less than the listed price',
  INVALID_AMOUNT: 'Not a valid amount',
  INVALID_PERCENT: 'Not a valid percentage',
  INVALID_INPUT: 'Not valid',
};

/** Only the facts a client may see: account names and internal ids stay out. */
function publicDetails(error: DomainError): Record<string, unknown> | undefined {
  if (!error.details) return undefined;
  const { account: _account, ...rest } = error.details;
  return rest;
}

/**
 * The one table that turns a refusal of @yoyo/domain into the API's error contract (plan 8, Global
 * Constraints). Broken money invariants (UNBALANCED_OPERATION, NEGATIVE_BALANCE) and invalid stored
 * prices are bugs of ours, never the user's: 500.
 */
export function fromDomainError(error: DomainError): AppError {
  const field = FIELD_OF[error.code];
  if (field !== undefined) {
    const named = typeof error.details?.['field'] === 'string' ? (error.details['field'] as string) : field;
    return new AppError('VALIDATION_FAILED', 400, undefined, { [named]: MESSAGES[error.code] ?? 'Not valid' }, {
      reason: error.code,
      ...publicDetails(error),
    });
  }
  switch (error.code) {
    case 'DATES_UNAVAILABLE':
    case 'CANNOT_RENT_OWN':
    case 'INSUFFICIENT_FUNDS':
    case 'CONTRACT_NOT_SIGNED':
      return new AppError(error.code, 409, undefined, undefined, publicDetails(error));
    case 'TRANSITION_NOT_ALLOWED':
      return new AppError('ACTION_NOT_ALLOWED', 409, undefined, undefined, publicDetails(error));
    case 'NOT_A_PARTY':
      return new AppError('NOT_FOUND', 404, 'Booking not found');
    default:
      return new AppError('INTERNAL', 500);
  }
}

export { DomainError };
