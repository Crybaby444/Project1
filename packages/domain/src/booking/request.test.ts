import { describe, expect, it } from 'vitest';
import { endOfDayIn, localDate, period } from '../dates';
import { cents } from '../money';
import { quote } from '../pricing';
import { decide } from './decide';
import { createRequest } from './request';
import { HOUR_MS, NOW, OWNER_ID, RENTER_ID, ctx, later, owner, pricing, renter, requestInput } from './test-support';
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
      period: p('2026-11-05', '2026-11-07'),
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

  describe('the launch offer on the fee (owner decision of 2026-11-06)', () => {
    // NOW is 4 November 2026, 12:00 in Riga. The offer's last day is the 5th, so it ends at 22:00 UTC that day.
    const promo = { ...ctx.settings, servicePercent: 10, promoServicePercent: 0, promoServiceUntil: localDate('2026-11-05') };

    it('prices a request in the window with the offer, and records it', () => {
      const { quote: q } = createRequest(requestInput(), { ...ctx, settings: promo }).next;
      expect(q).toMatchObject({ servicePercent: 0, serviceFeeCents: 0, servicePromoUntil: '2026-11-05', totalCents: q.rentCents + q.depositCents });
    });

    it('prices a request after the window with the regular fee', () => {
      const after = { ...ctx, settings: promo, now: new Date('2026-11-05T22:00:00Z') };
      const input = requestInput({ period: p('2026-11-07', '2026-11-09') });
      expect(createRequest(input, after).next.quote).toMatchObject({ servicePercent: 10, serviceFeeCents: 450, servicePromoUntil: null });
      const justBefore = { ...after, now: new Date('2026-11-05T21:59:59.999Z') };
      expect(createRequest(input, justBefore).next.quote.servicePercent).toBe(0);
    });

    it('keeps the frozen fee through the deal, whatever the settings and the clock say later', () => {
      const input = requestInput({ period: p('2026-11-10', '2026-11-12') });
      const requested = createRequest(input, { ...ctx, settings: promo }).next;
      // The administrator raises the fee and ends the offer; the deal is accepted, signed and paid after the window.
      const raised = { ...promo, servicePercent: 25, promoServiceUntil: null };
      const accepted = decide(requested, owner, { type: 'ACCEPT' }, { ...later(ctx, 20), settings: raised, blocked: [] }).next;
      const afterWindow = { ...later(ctx, 40), settings: raised };
      const signed = decide(decide(accepted, owner, { type: 'SIGN' }, afterWindow).next, renter, { type: 'SIGN' }, afterWindow).next;
      const { next: paid, effects } = decide(signed, renter, { type: 'PAY', method: 'CARD' }, afterWindow);
      expect(paid.quote).toEqual(requested.quote);
      expect(effects).toContainEqual(
        expect.objectContaining({ kind: 'LEDGER', operation: expect.objectContaining({ postings: expect.not.arrayContaining([expect.objectContaining({ account: 'platform:revenue' })]) }) }),
      );
    });
  });

  it('uses an agreed daily price, which must be below the listed one', () => {
    const agreed = createRequest(requestInput({ agreedDailyCents: cents(1200) }), ctx).next.quote;
    expect(agreed).toMatchObject({ dailyCents: 1200, rentCents: 3600 });
    expect(() => createRequest(requestInput({ agreedDailyCents: cents(1500) }), ctx)).toThrow(
      code('INVALID_OFFER'),
    );
  });

  it('books a week at the listed price when the weekly discount beats the accepted offer (F3)', () => {
    const week = requestInput({ period: p('2026-11-05', '2026-11-11'), agreedDailyCents: cents(1300) });
    expect(createRequest(week, ctx).next.quote).toMatchObject({ rentCents: 8400, priceSource: 'LISTED' });
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
    expect(() => createRequest(requestInput({ blocked: [p('2026-11-07', '2026-11-09')] }), ctx)).toThrow(
      expect.objectContaining({
        code: 'DATES_UNAVAILABLE',
        details: { conflict: p('2026-11-07', '2026-11-09') },
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
