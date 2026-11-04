import { describe, expect, it } from 'vitest';
import * as domain from './index';

describe('@yoyo/domain entry point', () => {
  it('exports the whole public API, and nothing else', () => {
    expect(Object.keys(domain).sort()).toEqual(
      [
        'DOMAIN_ERROR_CODES',
        'DomainError',
        'add',
        'cents',
        'formatMoney',
        'mulInt',
        'percentOf',
        'sub',
      ].sort(),
    );
  });
});
