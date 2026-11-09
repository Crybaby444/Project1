import { describe, expect, it } from 'vitest';
import { monthLabel } from './month-label';

describe('monthLabel', () => {
  const november = new Date(Date.UTC(2026, 10, 1));

  it('is the bare month name and the year, in every language', () => {
    expect(monthLabel('en').format(november)).toBe('November 2026');
    expect(monthLabel('lv').format(november)).toBe('novembris 2026');
    expect(monthLabel('ru').format(november)).toBe('ноябрь 2026');
  });
});
