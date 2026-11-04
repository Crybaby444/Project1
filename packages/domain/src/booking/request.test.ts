import { describe, expect, it } from 'vitest';
import { endOfDayIn, localDate, period } from '../dates';
import { cents } from '../money';
import { quote } from '../pricing';
import { createRequest } from './request';
import { HOUR_MS, NOW, OWNER_ID, RENTER_ID, ctx, pricing, requestInput } from './test-support';
import type { DecideContext } from './types';

const code = (expected: string) => expect.objectContaining({ code: expected });
const p = (start: string, end: string) => period(localDate(start), localDate(end));

describe('createRequest', () => {
  it('opens a request the owner has 24 hours to answer', () => {
    const { next, effects } = createRequest(requestInput(), ctx);
    const expiresAt = new Date(NOW.getTime() + 24 * HOUR_MS);
    expect(next).toEqual({
      id: 'booking-1',
      listingId: 'listing-1',
      renterId: RENTER_ID,
      ownerId: OWNER_ID,
      status: 'REQUESTED',
      period: p('2026-11-10', '2026-11-12'),
      timeZone: 'Europe/Riga',
      quote: quote({ pricing, days: 3, servicePercent: 10 }),
      timers: { REQUEST_EXPIRY: expiresAt },
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(effects).toEqual([
      { kind: 'SCHEDULE', timer: 'REQUEST_EXPIRY', at: expiresAt },
      { kind: 'NOTIFY', to: 'OWNER', template: 'REQUESTED' },
      { kind: 'SYSTEM_MESSAGE', template: 'REQUESTED' },
    ]);
  });

  it('lets an unanswered request live no longer than the first rental day', () => {
    const start = localDate('2026-11-10');
    const nightOfStartDay: DecideContext = { ...ctx, now: new Date('2026-11-10T21:30:00Z') }; // 23:30 in Riga
    const nightOfStartDayRequest = requestInput({ period: period(start, localDate('2026-11-12')) });
    expect(createRequest(nightOfStartDayRequest, nightOfStartDay).next.timers.REQUEST_EXPIRY).toEqual(
      endOfDayIn(start, 'Europe/Riga'),
    );
  });

  it('prices the request with the service fee from the settings', () => {
    const settings = { ...ctx.settings, servicePercent: 12 };
    expect(createRequest(requestInput(), { ...ctx, settings }).next.quote.serviceFeeCents).toBe(540);
  });

  it('uses an agreed daily price, which must be below the listed one', () => {
    const agreed = createRequest(requestInput({ agreedDailyCents: cents(1200) }), ctx).next.quote;
    expect(agreed).toMatchObject({ dailyCents: 1200, rentCents: 3600 });
    expect(() => createRequest(requestInput({ agreedDailyCents: cents(1500) }), ctx)).toThrow(
      code('INVALID_OFFER'),
    );
  });

  it('refuses renting your own item', () => {
    expect(() => createRequest(requestInput({ renterId: OWNER_ID }), ctx)).toThrow(code('CANNOT_RENT_OWN'));
  });

  it('checks the dates against "today" in the item’s time zone (Review Focus 4)', () => {
    // 22:30 UTC on 3 Nov is already 4 Nov in Riga, so a rental from 3 Nov would start in the past.
    const lateEvening: DecideContext = { ...ctx, now: new Date('2026-11-03T22:30:00Z') };
    expect(() => createRequest(requestInput({ period: p('2026-11-03', '2026-11-05') }), lateEvening)).toThrow(
      code('START_IN_PAST'),
    );
    expect(
      createRequest(requestInput({ period: p('2026-11-04', '2026-11-05') }), lateEvening).next.status,
    ).toBe('REQUESTED');
  });

  it('refuses a start too far ahead and a length the listing does not allow', () => {
    expect(() => createRequest(requestInput({ period: p('2027-11-05', '2027-11-06') }), ctx)).toThrow(
      code('TOO_FAR_AHEAD'),
    );
    const twoDaysMinimum = { ...pricing, minDays: 2 };
    expect(() =>
      createRequest(requestInput({ pricing: twoDaysMinimum, period: p('2026-11-10', '2026-11-10') }), ctx),
    ).toThrow(code('PERIOD_TOO_SHORT'));
    expect(() => createRequest(requestInput({ period: p('2026-11-10', '2026-12-10') }), ctx)).toThrow(
      code('PERIOD_TOO_LONG'),
    );
  });

  it('refuses dates that are already taken', () => {
    expect(() => createRequest(requestInput({ blocked: [p('2026-11-12', '2026-11-14')] }), ctx)).toThrow(
      expect.objectContaining({
        code: 'DATES_UNAVAILABLE',
        details: { conflict: p('2026-11-12', '2026-11-14') },
      }),
    );
  });

  it('refuses empty ids and an unknown time zone', () => {
    for (const field of ['id', 'listingId', 'renterId', 'ownerId'] as const) {
      expect(() => createRequest(requestInput({ [field]: '' }), ctx)).toThrow(code('INVALID_INPUT'));
    }
    expect(() => createRequest(requestInput({ timeZone: 'Mars/Olympus' }), ctx)).toThrow(
      code('INVALID_INPUT'),
    );
  });
});
