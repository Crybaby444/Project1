import { describe, expect, it } from 'vitest';
import { publicName } from './public-name';

describe('publicName', () => {
  it('is the @username, else only the first name; a deleted account says so', () => {
    expect(publicName({ name: 'Olga Kalniņa', username: 'olga.k' })).toBe('@olga.k');
    expect(publicName({ name: 'Gina  Google', username: null })).toBe('Gina');
    expect(publicName({ name: 'Olga Kalniņa', username: 'olga.k', deletedAt: new Date() })).toBe('Deleted user');
  });
});
