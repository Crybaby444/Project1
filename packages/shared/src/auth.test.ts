import { describe, expect, it } from 'vitest';
import { EmailSchema, PasswordSchema, PublicUserSchema, RegisterRequestSchema } from './auth';

describe('EmailSchema', () => {
  it('trims and lowercases before validating', () => {
    expect(EmailSchema.parse('  Anna@Mail.LV ')).toBe('anna@mail.lv');
  });

  it('rejects what is not an email address', () => {
    expect(EmailSchema.safeParse('nope').success).toBe(false);
    expect(EmailSchema.safeParse('   ').success).toBe(false);
    expect(EmailSchema.safeParse(`${'a'.repeat(250)}@b.lv`).success).toBe(false);
  });
});

describe('PasswordSchema', () => {
  it('takes 8 to 128 characters exactly as typed', () => {
    expect(PasswordSchema.safeParse('1234567').success).toBe(false);
    expect(PasswordSchema.parse(' 1234567')).toBe(' 1234567');
    expect(PasswordSchema.safeParse('x'.repeat(128)).success).toBe(true);
    expect(PasswordSchema.safeParse('x'.repeat(129)).success).toBe(false);
  });
});

describe('RegisterRequestSchema', () => {
  const anna = { email: 'anna@mail.lv', password: 'correct horse', name: 'Anna' };

  it('makes the language optional and accepts only supported ones', () => {
    expect(RegisterRequestSchema.parse(anna)).toEqual(anna);
    expect(RegisterRequestSchema.parse({ ...anna, locale: 'lv' }).locale).toBe('lv');
    expect(RegisterRequestSchema.safeParse({ ...anna, locale: 'de' }).success).toBe(false);
  });

  it('needs a name of 1 to 60 characters after trimming', () => {
    expect(RegisterRequestSchema.parse({ ...anna, name: '  Anna  ' }).name).toBe('Anna');
    expect(RegisterRequestSchema.safeParse({ ...anna, name: '   ' }).success).toBe(false);
    expect(RegisterRequestSchema.safeParse({ ...anna, name: 'x'.repeat(61) }).success).toBe(false);
  });
});

describe('PublicUserSchema', () => {
  it('drops anything that is not part of the public shape, such as the password hash', () => {
    const user = {
      id: 'u1',
      email: 'anna@mail.lv',
      name: 'Anna',
      city: null,
      about: null,
      locale: 'lv',
      theme: 'system',
      role: 'USER',
      emailVerified: false,
      hasPassword: true,
      phone: null,
      phoneVerified: false,
      createdAt: '2026-11-03T10:00:00.000Z',
    };
    expect(PublicUserSchema.parse({ ...user, passwordHash: '$argon2id$…', blockedAt: null })).toEqual(user);
  });
});
