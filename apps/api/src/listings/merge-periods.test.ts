import { localDate } from '@yoyo/domain';
import { describe, expect, it } from 'vitest';
import { mergePeriods } from './listings.service';

const today = localDate('2026-11-01');

describe('mergePeriods', () => {
  it('glues [1–5] and [4–8] into [1–8], and touching [1–5] and [6–8] as well', () => {
    expect(mergePeriods([{ start: '2026-12-04', end: '2026-12-08' }, { start: '2026-12-01', end: '2026-12-05' }], today)).toEqual([
      { start: '2026-12-01', end: '2026-12-08' },
    ]);
    expect(mergePeriods([{ start: '2026-12-01', end: '2026-12-05' }, { start: '2026-12-06', end: '2026-12-08' }], today)).toEqual([
      { start: '2026-12-01', end: '2026-12-08' },
    ]);
  });

  it('keeps a period inside another as one, and separate periods apart, in order', () => {
    expect(
      mergePeriods(
        [
          { start: '2026-12-10', end: '2026-12-12' },
          { start: '2026-12-01', end: '2026-12-20' },
          { start: '2027-01-05', end: '2027-01-05' },
        ],
        today,
      ),
    ).toEqual([
      { start: '2026-12-01', end: '2026-12-20' },
      { start: '2027-01-05', end: '2027-01-05' },
    ]);
  });

  it('drops periods that ended before today and keeps one that is still going on', () => {
    expect(mergePeriods([{ start: '2026-10-01', end: '2026-10-31' }, { start: '2026-10-30', end: '2026-11-01' }], today)).toEqual([
      { start: '2026-10-30', end: '2026-11-01' },
    ]);
  });

  it('handles the last day the calendar knows without failing', () => {
    expect(mergePeriods([{ start: '2027-01-01', end: '9999-12-31' }, { start: '2027-02-01', end: '2027-02-02' }], today)).toEqual([
      { start: '2027-01-01', end: '9999-12-31' },
    ]);
  });

  it('refuses end before start (core `period`) and days that do not exist, naming the field', () => {
    expect(() => mergePeriods([{ start: '2026-12-05', end: '2026-12-01' }], today)).toThrow(
      expect.objectContaining({ code: 'VALIDATION_FAILED', fields: { 'periods.0.end': expect.any(String) } }),
    );
    expect(() => mergePeriods([{ start: '2026-12-01', end: '2026-12-02' }, { start: '2027-02-29', end: '2027-03-01' }], today)).toThrow(
      expect.objectContaining({ fields: { 'periods.1.start': expect.any(String) } }),
    );
  });
});
