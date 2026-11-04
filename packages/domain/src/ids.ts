import { DomainError } from './errors';

/**
 * Checks that an id is a non-empty string. An empty id would make records collide, for example every
 * empty user id would share the account `wallet:`. Internal: not exported from the package.
 */
export function requireId(value: string, field: string): string {
  if (typeof value !== 'string' || value === '') {
    throw new DomainError('INVALID_INPUT', { field, value: String(value) });
  }
  return value;
}
