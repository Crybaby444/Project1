import { describe, expect, it } from 'vitest';
import { formatDay, formatDayInText } from './format';

describe('formatDayInText', () => {
  it('drops the Russian year mark, so a sentence that ends on a date ends with one period', () => {
    expect(formatDay('2026-11-30', 'ru')).toMatch(/г\.$/u);
    expect(`по ${formatDayInText('2026-11-30', 'ru')}.`).toBe('по 30 ноября 2026.');
  });

  it('leaves English and Latvian days as they are', () => {
    expect(formatDayInText('2026-11-30', 'en')).toBe('November 30, 2026');
    expect(formatDayInText('2026-11-30', 'lv')).toBe(formatDay('2026-11-30', 'lv'));
  });
});
