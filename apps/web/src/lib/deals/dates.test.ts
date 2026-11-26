import { describe, expect, it } from 'vitest';
import { formatPeriod, plainDates } from './dates';

describe('plainDates', () => {
  it('gives a range the same dash and spaces on the server and in the browser', () => {
    // Node's ICU writes «6—8 дек.» with an em dash, Chrome «6–8 дек.»: the page then failed to hydrate.
    expect(plainDates('6—8 дек. 2026 г.')).toBe('6–8 дек. 2026 г.');
    expect(plainDates('30 нояб. – 2 дек.')).toBe('30 нояб. – 2 дек.');
    expect(plainDates('12 Nov')).toBe('12 Nov');
  });

  it('is what formatPeriod returns: no em dash, no thin spaces', () => {
    for (const locale of ['en', 'lv', 'ru']) {
      for (const [start, end] of [
        ['2026-12-06', '2026-12-08'],
        ['2026-11-30', '2026-12-02'],
        ['2026-12-30', '2027-01-02'],
      ] as const) {
        expect(formatPeriod(start, end, locale)).not.toMatch(/[—  ]/u);
      }
    }
  });
});
