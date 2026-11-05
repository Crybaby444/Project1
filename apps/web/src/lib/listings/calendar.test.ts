import { describe, expect, it } from 'vitest';
import {
  addDays,
  isUnavailable,
  mergePeriods,
  monthGrid,
  todayIn,
  toggleDay,
  toggleRange,
  weekStartFor,
} from './calendar';

describe('calendar days', () => {
  it('lays out December 2026 in weeks from Monday, starting on 30 November', () => {
    const weeks = monthGrid(2026, 12, 1);
    expect(weeks[0]![0]).toEqual({ date: '2026-11-30', inMonth: false });
    expect(weeks[0]![1]).toEqual({ date: '2026-12-01', inMonth: true });
    expect(weeks.at(-1)!.at(-1)).toEqual({ date: '2027-01-03', inMonth: false });
    expect(weeks.every((week) => week.length === 7)).toBe(true);
  });

  it('starts the week on Monday in all three languages', () => {
    expect([weekStartFor('en'), weekStartFor('lv'), weekStartFor('ru')]).toEqual([1, 1, 1]);
  });

  it('can start the week on Sunday', () => {
    expect(monthGrid(2026, 12, 0)[0]![0]!.date).toBe('2026-11-29');
  });

  it('counts days across months and years', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('knows today in the listing’s time zone', () => {
    const lateInRiga = new Date('2026-11-04T22:30:00Z'); // already 5 November in Riga
    expect(todayIn('Europe/Riga', lateInRiga)).toBe('2026-11-05');
    expect(todayIn('America/New_York', lateInRiga)).toBe('2026-11-04');
  });
});

describe('unavailable periods', () => {
  it('merges overlapping and touching periods, like the API', () => {
    expect(
      mergePeriods([
        { start: '2026-12-04', end: '2026-12-08' },
        { start: '2026-12-01', end: '2026-12-05' },
        { start: '2026-12-09', end: '2026-12-09' },
        { start: '2026-12-20', end: '2026-12-21' },
      ]),
    ).toEqual([
      { start: '2026-12-01', end: '2026-12-09' },
      { start: '2026-12-20', end: '2026-12-21' },
    ]);
  });

  it('marks a free day and clears a marked one, splitting its period', () => {
    const marked = toggleDay([], '2026-12-02');
    expect(marked).toEqual([{ start: '2026-12-02', end: '2026-12-02' }]);
    expect(isUnavailable(marked, '2026-12-02')).toBe(true);
    expect(toggleDay([{ start: '2026-12-01', end: '2026-12-05' }], '2026-12-03')).toEqual([
      { start: '2026-12-01', end: '2026-12-02' },
      { start: '2026-12-04', end: '2026-12-05' },
    ]);
    expect(toggleDay([{ start: '2026-12-01', end: '2026-12-01' }], '2026-12-01')).toEqual([]);
  });

  it('marks a whole period, or clears it when it is all marked already', () => {
    const periods = toggleRange([{ start: '2026-12-03', end: '2026-12-03' }], '2026-12-05', '2026-12-01');
    expect(periods).toEqual([{ start: '2026-12-01', end: '2026-12-05' }]);
    expect(toggleRange(periods, '2026-12-02', '2026-12-04')).toEqual([
      { start: '2026-12-01', end: '2026-12-01' },
      { start: '2026-12-05', end: '2026-12-05' },
    ]);
  });
});
