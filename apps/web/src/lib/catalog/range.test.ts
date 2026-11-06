import { describe, expect, it } from 'vitest';
import { dayRole, pickDay } from './range';

const blocked = [{ start: '2026-12-10', end: '2026-12-12' }];

describe('pickDay', () => {
  it('takes the start, then the end', () => {
    const start = pickDay(null, '2026-12-02');
    expect(start).toEqual({ start: '2026-12-02', end: null });
    expect(pickDay(start, '2026-12-05')).toEqual({ start: '2026-12-02', end: '2026-12-05' });
    expect(pickDay(start, '2026-12-02')).toEqual({ start: '2026-12-02', end: '2026-12-02' });
  });

  it('starts again on a day before the start, after a whole period, or across a taken day', () => {
    expect(pickDay({ start: '2026-12-05', end: null }, '2026-12-03')).toEqual({ start: '2026-12-03', end: null });
    expect(pickDay({ start: '2026-12-02', end: '2026-12-04' }, '2026-12-20')).toEqual({ start: '2026-12-20', end: null });
    expect(pickDay({ start: '2026-12-08', end: null }, '2026-12-14', blocked)).toEqual({ start: '2026-12-14', end: null });
  });
});

describe('dayRole', () => {
  it('marks the start, the end, the days between and the preview while choosing', () => {
    const range = { start: '2026-12-02', end: '2026-12-04' };
    expect(['2026-12-02', '2026-12-03', '2026-12-04', '2026-12-05'].map((d) => dayRole(range, d))).toEqual(['start', 'inside', 'end', null]);
    expect(dayRole({ start: '2026-12-02', end: null }, '2026-12-03', '2026-12-04')).toBe('preview');
  });
});
