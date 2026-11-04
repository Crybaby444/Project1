import type { Locale } from '@yoyo/shared';
import { describe, expect, it } from 'vitest';
import { add, cents, formatMoney, mulInt, percentOf, sub } from './money';

const code = (expected: string) => expect.objectContaining({ code: expected });

describe('cents', () => {
  it('accepts whole, non-negative, safe amounts', () => {
    expect(cents(0)).toBe(0);
    expect(cents(123450)).toBe(123450);
    expect(cents(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER);
  });

  it.each([1.5, 0.1, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
    'rejects %s',
    (value) => {
      expect(() => cents(value)).toThrow(code('INVALID_AMOUNT'));
    },
  );
});

describe('add, sub, mulInt', () => {
  it('adds any number of amounts', () => {
    expect(add()).toBe(0);
    expect(add(cents(4500), cents(450), cents(10000))).toBe(14950);
  });

  it('refuses a sum beyond the safe range', () => {
    expect(() => add(cents(Number.MAX_SAFE_INTEGER), cents(1))).toThrow(code('INVALID_AMOUNT'));
  });

  it('subtracts down to zero but never below', () => {
    expect(sub(cents(10500), cents(2100))).toBe(8400);
    expect(sub(cents(2), cents(2))).toBe(0);
    expect(() => sub(cents(1), cents(2))).toThrow(code('INVALID_AMOUNT'));
  });

  it('multiplies by a whole, non-negative count', () => {
    expect(mulInt(cents(1500), 3)).toBe(4500);
    expect(mulInt(cents(1500), 0)).toBe(0);
  });

  it.each([1.5, -1, Number.NaN])('refuses the multiplier %s', (n) => {
    expect(() => mulInt(cents(100), n)).toThrow(code('INVALID_INPUT'));
  });

  it('refuses a product beyond the safe range', () => {
    expect(() => mulInt(cents(Number.MAX_SAFE_INTEGER), 2)).toThrow(code('INVALID_AMOUNT'));
  });
});

describe('percentOf', () => {
  it('rounds to the cent, half up (Review Focus 5)', () => {
    expect(percentOf(cents(1234), 10)).toBe(123);
    expect(percentOf(cents(5), 10)).toBe(1);
    expect(percentOf(cents(4), 10)).toBe(0);
    expect(percentOf(cents(15), 10)).toBe(2);
    expect(percentOf(cents(14), 10)).toBe(1);
  });

  it('covers the whole 0–100 range', () => {
    expect(percentOf(cents(4500), 0)).toBe(0);
    expect(percentOf(cents(4500), 100)).toBe(4500);
    expect(percentOf(cents(0), 10)).toBe(0);
  });

  it.each([10.5, -1, 101, Number.NaN])('refuses the percent %s', (percent) => {
    expect(() => percentOf(cents(100), percent)).toThrow(code('INVALID_PERCENT'));
  });

  it('refuses an amount too large to round exactly', () => {
    expect(() => percentOf(cents(Number.MAX_SAFE_INTEGER), 100)).toThrow(code('INVALID_AMOUNT'));
  });
});

describe('formatMoney', () => {
  const norm = (s: string) => s.replace(/\s/g, ' ');

  it('formats euros in each interface language with two decimals', () => {
    expect(norm(formatMoney(cents(123450), 'en'))).toBe('€1,234.50');
    expect(norm(formatMoney(cents(123450), 'lv'))).toBe('1 234,50 €');
    expect(norm(formatMoney(cents(123450), 'ru'))).toBe('1 234,50 €');
  });

  it('keeps every cent exact, from zero to large sums', () => {
    expect(norm(formatMoney(cents(0), 'en'))).toBe('€0.00');
    expect(norm(formatMoney(cents(5), 'lv'))).toBe('0,05 €');
    expect(norm(formatMoney(cents(123456789), 'en'))).toBe('€1,234,567.89');
    expect(norm(formatMoney(cents(900719925474099), 'en'))).toBe('€9,007,199,254,740.99');
  });

  it('refuses a language it does not know instead of guessing one', () => {
    expect(() => formatMoney(cents(100), 'de' as Locale)).toThrow(code('INVALID_INPUT'));
  });
});
