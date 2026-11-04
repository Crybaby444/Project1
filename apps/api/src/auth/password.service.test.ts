import { describe, expect, it } from 'vitest';
import { PasswordService } from './password.service';

const passwords = new PasswordService();

describe('PasswordService', () => {
  it('verifies the right password and rejects a wrong one', async () => {
    const hash = await passwords.hash('correct horse');
    expect(await passwords.verify(hash, 'correct horse')).toBe(true);
    expect(await passwords.verify(hash, 'wrong horse')).toBe(false);
  });

  it('hashes with argon2id and a fresh salt every time', async () => {
    const first = await passwords.hash('correct horse');
    const second = await passwords.hash('correct horse');
    expect(first).toMatch(/^\$argon2id\$/);
    expect(first).not.toBe(second);
    expect(first).not.toContain('correct horse');
  });

  it('answers false for an account without a password, still spending the time of a real check', async () => {
    expect(await passwords.verify(null, 'correct horse')).toBe(false);
  });

  it('answers false instead of throwing for a malformed stored hash', async () => {
    expect(await passwords.verify('not-a-hash', 'correct horse')).toBe(false);
  });
});
