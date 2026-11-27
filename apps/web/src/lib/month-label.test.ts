import { describe, expect, it } from 'vitest';
import { monthLabel, sinceLabel } from './month-label';

describe('monthLabel', () => {
  const november = new Date(Date.UTC(2026, 10, 1));

  it('is the bare month name and the year, in every language', () => {
    expect(monthLabel('en').format(november)).toBe('November 2026');
    expect(monthLabel('lv').format(november)).toBe('novembris 2026');
    expect(monthLabel('ru').format(november)).toBe('ноябрь 2026');
  });
});

describe('sinceLabel', () => {
  it('words the join month to follow "since" in each language, in Riga time', () => {
    expect(sinceLabel('2026-11-10T12:00:00.000Z', 'ru')).toBe('ноября 2026 г.');
    expect(sinceLabel('2026-11-10T12:00:00.000Z', 'lv')).toBe('2026. gada novembra');
    expect(sinceLabel('2026-11-10T12:00:00.000Z', 'en')).toBe('November 2026');
    // 23:30 UTC on 31 Oct is already 1 Nov in Riga.
    expect(sinceLabel('2026-10-31T23:30:00.000Z', 'ru')).toBe('ноября 2026 г.');
  });
});
