import { describe, expect, it } from 'vitest';
import { centsToInput, formatEuros, parseEuros } from './money';

describe('parseEuros', () => {
  it('reads euros with a comma or a point as cents', () => {
    expect(parseEuros('12,5')).toBe(1250);
    expect(parseEuros('12.50')).toBe(1250);
    expect(parseEuros(' 7 ')).toBe(700);
    expect(parseEuros('0,99')).toBe(99);
    expect(parseEuros('1 200')).toBe(120_000);
  });

  it('gives null for an empty field', () => {
    expect(parseEuros('')).toBeNull();
    expect(parseEuros('   ')).toBeNull();
  });

  it('gives NaN for anything that is not an amount', () => {
    for (const bad of ['abc', '1.234', '12,', '-5', '1e3', '12,5,0', '€12'])
      expect(parseEuros(bad)).toBeNaN();
  });
});

describe('formatting', () => {
  it('formats cents as euros in the page language', () => {
    expect(formatEuros(1250, 'en')).toBe('€12.50');
    expect(formatEuros(1200, 'en')).toBe('€12');
    expect(formatEuros(1250, 'lv').replace(/\s/g, ' ')).toBe('12,50 €');
  });

  it('writes an input value back the way the visitor types it', () => {
    expect(centsToInput(1250, 'en')).toBe('12.50');
    expect(centsToInput(1250, 'ru')).toBe('12,50');
    expect(centsToInput(1200, 'lv')).toBe('12');
    expect(centsToInput(null, 'en')).toBe('');
  });
});
