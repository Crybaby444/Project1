import { describe, expect, it } from 'vitest';
import { ageOn, BirthDateSchema, FullNameSchema, UsernameSchema } from './identity';

describe('identity rules', () => {
  it('usernames: lowercase, a–z 0–9 . _, 3–20, not reserved', () => {
    expect(UsernameSchema.parse(' @Olga.K_92 ')).toBe('olga.k_92');
    for (const bad of ['ab', '_olga', 'olga.', 'ol..ga', 'olga kalnina', 'ольга', 'admin', 'a'.repeat(21)]) {
      expect(UsernameSchema.safeParse(bad).success, bad).toBe(false);
    }
  });

  it('full names have a first and a last name', () => {
    expect(FullNameSchema.safeParse('Olga Kalniņa').success).toBe(true);
    expect(FullNameSchema.safeParse('Olga').success).toBe(false);
  });

  it('birth dates are real days; age counts the birthday', () => {
    expect(BirthDateSchema.safeParse('2008-02-30').success).toBe(false);
    expect(BirthDateSchema.safeParse('1899-12-31').success).toBe(false);
    expect(ageOn('2008-11-16', '2026-11-16')).toBe(18);
    expect(ageOn('2008-11-17', '2026-11-16')).toBe(17);
    expect(ageOn('2000-02-29', '2026-02-28')).toBe(25);
  });
});
