import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TIME_ZONE,
  addDays,
  compareDates,
  daysIn,
  diffDays,
  endOfDayIn,
  firstConflict,
  localDate,
  localDateIn,
  overlaps,
  period,
  validateRentalPeriod,
} from './dates';

const code = (expected: string) => expect.objectContaining({ code: expected });
const p = (start: string, end: string) => period(localDate(start), localDate(end));

describe('localDate', () => {
  it('accepts real calendar days written as YYYY-MM-DD', () => {
    expect(localDate('2026-11-04')).toBe('2026-11-04');
    expect(localDate('2028-02-29')).toBe('2028-02-29');
    expect(localDate('2000-02-29')).toBe('2000-02-29');
  });

  it.each([
    '2026-02-29',
    '1900-02-29',
    '2026-04-31',
    '2026-13-01',
    '2026-00-10',
    '2026-11-00',
    '2026-1-05',
    '26-11-04',
    '2026-11-04T00:00',
    ' 2026-11-04',
    '2026/11/04',
    '',
  ])('rejects %j', (value) => {
    expect(() => localDate(value)).toThrow(code('INVALID_DATE'));
  });
});

describe('day arithmetic', () => {
  it('adds days across months, years and leap days', () => {
    expect(addDays(localDate('2026-11-30'), 1)).toBe('2026-12-01');
    expect(addDays(localDate('2026-12-31'), 1)).toBe('2027-01-01');
    expect(addDays(localDate('2028-02-28'), 1)).toBe('2028-02-29');
    expect(addDays(localDate('2026-03-01'), -1)).toBe('2026-02-28');
    expect(addDays(localDate('2026-11-04'), 365)).toBe('2027-11-04');
  });

  it('refuses a fractional number of days', () => {
    expect(() => addDays(localDate('2026-11-04'), 1.5)).toThrow(code('INVALID_INPUT'));
  });

  it('counts calendar days, unaffected by daylight saving', () => {
    expect(diffDays(localDate('2027-03-27'), localDate('2027-03-29'))).toBe(2);
    expect(diffDays(localDate('2026-10-24'), localDate('2026-10-26'))).toBe(2);
    expect(diffDays(localDate('2026-11-04'), localDate('2026-11-01'))).toBe(-3);
  });

  it('compares days', () => {
    expect(compareDates(localDate('2026-11-04'), localDate('2026-11-05'))).toBe(-1);
    expect(compareDates(localDate('2026-11-04'), localDate('2026-11-04'))).toBe(0);
    expect(compareDates(localDate('2027-01-01'), localDate('2026-12-31'))).toBe(1);
  });
});

describe('days in the item’s time zone (Review Focus 4)', () => {
  it('defaults to Riga', () => {
    expect(DEFAULT_TIME_ZONE).toBe('Europe/Riga');
  });

  it('knows that "today" in Riga can already be tomorrow in UTC', () => {
    expect(localDateIn(new Date('2026-11-03T22:30:00Z'), 'Europe/Riga')).toBe('2026-11-04');
    expect(localDateIn(new Date('2027-07-01T21:30:00Z'), 'Europe/Riga')).toBe('2027-07-02');
    expect(localDateIn(new Date('2026-11-03T21:59:59.999Z'), 'Europe/Riga')).toBe('2026-11-03');
  });

  it('ends a day at the next local midnight, on both sides of a clock change', () => {
    expect(endOfDayIn(localDate('2027-03-28'), 'Europe/Riga').toISOString()).toBe('2027-03-28T21:00:00.000Z');
    expect(endOfDayIn(localDate('2026-11-04'), 'Europe/Riga').toISOString()).toBe('2026-11-04T22:00:00.000Z');
    expect(endOfDayIn(localDate('2027-03-27'), 'Europe/Riga').toISOString()).toBe('2027-03-27T22:00:00.000Z');
    expect(endOfDayIn(localDate('2026-10-24'), 'Europe/Riga').toISOString()).toBe('2026-10-24T21:00:00.000Z');
    expect(endOfDayIn(localDate('2026-10-25'), 'Europe/Riga').toISOString()).toBe('2026-10-25T22:00:00.000Z');
  });

  it('ends a day at the first instant of the next one where clocks skip midnight', () => {
    // Havana jumps from 00:00 to 01:00 on 14 March 2027: the 14th starts at 05:00 UTC.
    expect(endOfDayIn(localDate('2027-03-13'), 'America/Havana').toISOString()).toBe(
      '2027-03-14T05:00:00.000Z',
    );
  });

  it('refuses an unknown or missing time zone instead of using the server’s own', () => {
    const instant = new Date('2026-11-04T10:00:00Z');
    expect(() => localDateIn(instant, 'Mars/Olympus')).toThrow(code('INVALID_INPUT'));
    expect(() => localDateIn(instant, '')).toThrow(code('INVALID_INPUT'));
    expect(() => localDateIn(instant, undefined as unknown as string)).toThrow(code('INVALID_INPUT'));
    expect(() => endOfDayIn(localDate('2026-11-04'), 'Mars/Olympus')).toThrow(code('INVALID_INPUT'));
  });

  it('refuses an invalid instant', () => {
    expect(() => localDateIn(new Date(Number.NaN), 'Europe/Riga')).toThrow(code('INVALID_DATE'));
  });
});

describe('periods', () => {
  it('include both ends', () => {
    expect(daysIn(p('2027-03-27', '2027-03-29'))).toBe(3);
    expect(daysIn(p('2026-11-04', '2026-11-04'))).toBe(1);
    expect(daysIn(p('2026-12-30', '2027-01-02'))).toBe(4);
  });

  it('cannot end before they start', () => {
    expect(() => p('2026-11-05', '2026-11-04')).toThrow(code('INVALID_PERIOD'));
  });

  it('overlap when they share at least one day', () => {
    expect(overlaps(p('2026-11-10', '2026-11-12'), p('2026-11-12', '2026-11-14'))).toBe(true);
    expect(overlaps(p('2026-11-12', '2026-11-14'), p('2026-11-10', '2026-11-12'))).toBe(true);
    expect(overlaps(p('2026-11-10', '2026-11-20'), p('2026-11-12', '2026-11-13'))).toBe(true);
    expect(overlaps(p('2026-11-10', '2026-11-11'), p('2026-11-12', '2026-11-14'))).toBe(false);
    expect(overlaps(p('2026-11-15', '2026-11-16'), p('2026-11-12', '2026-11-14'))).toBe(false);
  });

  it('report the blocked period that collides first', () => {
    expect(
      firstConflict(p('2026-11-10', '2026-11-20'), [
        p('2026-11-01', '2026-11-05'),
        p('2026-11-15', '2026-11-16'),
      ]),
    ).toEqual(p('2026-11-15', '2026-11-16'));
    expect(
      firstConflict(p('2026-11-10', '2026-11-20'), [
        p('2026-11-18', '2026-11-25'),
        p('2026-11-08', '2026-11-11'),
      ]),
    ).toEqual(p('2026-11-08', '2026-11-11'));
  });

  it('report no conflict when every day is free', () => {
    expect(firstConflict(p('2026-11-10', '2026-11-20'), [])).toBeNull();
    expect(firstConflict(p('2026-11-10', '2026-11-20'), [p('2026-11-01', '2026-11-09')])).toBeNull();
  });
});

describe('validateRentalPeriod', () => {
  const rules = { today: localDate('2026-11-04'), minDays: 2, maxDays: 30, maxAdvanceDays: 365 };

  it('accepts a rental that starts today', () => {
    expect(() => validateRentalPeriod(p('2026-11-04', '2026-11-05'), rules)).not.toThrow();
  });

  it('refuses a start in the past', () => {
    expect(() =>
      validateRentalPeriod(p('2026-11-03', '2026-11-04'), {
        today: localDate('2026-11-04'),
        minDays: 1,
        maxDays: 30,
        maxAdvanceDays: 365,
      }),
    ).toThrow(code('START_IN_PAST'));
  });

  it('allows a start up to maxAdvanceDays ahead and no later', () => {
    expect(() => validateRentalPeriod(p('2027-11-04', '2027-11-05'), rules)).not.toThrow();
    expect(() => validateRentalPeriod(p('2027-11-05', '2027-11-06'), rules)).toThrow(
      expect.objectContaining({
        code: 'TOO_FAR_AHEAD',
        details: { start: '2027-11-05', latestStart: '2027-11-04' },
      }),
    );
  });

  it('keeps the length between minDays and maxDays', () => {
    expect(() => validateRentalPeriod(p('2026-11-10', '2026-11-10'), rules)).toThrow(
      expect.objectContaining({ code: 'PERIOD_TOO_SHORT', details: { days: 1, minDays: 2 } }),
    );
    expect(() => validateRentalPeriod(p('2026-11-10', '2026-11-11'), rules)).not.toThrow();
    expect(() => validateRentalPeriod(p('2026-11-10', '2026-12-09'), rules)).not.toThrow();
    expect(() => validateRentalPeriod(p('2026-11-10', '2026-12-10'), rules)).toThrow(
      expect.objectContaining({ code: 'PERIOD_TOO_LONG', details: { days: 31, maxDays: 30 } }),
    );
  });
});
