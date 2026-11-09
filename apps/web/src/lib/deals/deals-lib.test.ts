import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/session/api-error';
import { historyItem, testBooking } from '@/test/deals';
import { daysBetween, formatPeriod } from './dates';
import { remaining, tickFor } from './deadline';
import { newIdempotencyKey, useIdempotentMutation } from './idempotency';
import { isClosed, toneOf } from './status';
import { dealTimeline } from './timeline';

describe('useIdempotentMutation (Review Focus 1)', () => {
  function setup(mutate: (vars: string, key: string) => Promise<string>) {
    return renderHook(() => useIdempotentMutation<string, string>({ intent: (v) => v, mutate })).result;
  }

  it('makes keys the API accepts', () => {
    expect(newIdempotencyKey()).toMatch(/^[A-Za-z0-9_-]{8,100}$/);
    expect(newIdempotencyKey()).not.toBe(newIdempotencyKey());
  });

  it('sends one request for a double click', async () => {
    let resolve!: (value: string) => void;
    const mutate = vi.fn(() => new Promise<string>((r) => (resolve = r)));
    const result = setup(mutate);
    let first!: Promise<string>;
    let second!: Promise<string>;
    act(() => {
      first = result.current.run('pay');
      second = result.current.run('pay');
    });
    await act(async () => resolve('ok'));
    await expect(first).resolves.toBe('ok');
    await expect(second).resolves.toBe('ok');
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it('retries with the same key after a lost answer, and a new key after an answer', async () => {
    const keys: string[] = [];
    const answers = [ApiError.network(), new ApiError('IDEMPOTENCY_IN_PROGRESS', 409), 'done', 'again'];
    const result = setup(async (_v, key) => {
      keys.push(key);
      const next = answers.shift();
      if (next instanceof Error) throw next;
      return next as string;
    });
    await act(async () => expect(result.current.run('pay')).rejects.toBeInstanceOf(ApiError));
    await act(async () => expect(result.current.run('pay')).rejects.toBeInstanceOf(ApiError));
    await act(async () => expect(result.current.run('pay')).resolves.toBe('done'));
    await act(async () => expect(result.current.run('pay')).resolves.toBe('again'));
    expect(keys[0]).toBe(keys[1]);
    expect(keys[1]).toBe(keys[2]);
    expect(keys[3]).not.toBe(keys[2]);
  });

  it('spends the key on a definite error, and a new intent gets its own key', async () => {
    const keys: string[] = [];
    const result = setup(async (_v, key) => {
      keys.push(key);
      throw new ApiError('PAYMENT_DECLINED', 402);
    });
    await act(async () => expect(result.current.run('pay')).rejects.toThrow());
    await act(async () => expect(result.current.run('pay')).rejects.toThrow());
    await act(async () => expect(result.current.run('other')).rejects.toThrow());
    expect(new Set(keys).size).toBe(3);
  });
});

describe('statuses', () => {
  it('maps every status to the palette of DESIGN.md §4', () => {
    expect(toneOf('REQUESTED')).toBe('requested');
    expect(toneOf('PAID')).toBe('deposit');
    expect(toneOf('ACTIVE')).toBe('active');
    expect(toneOf('DISPUTED')).toBe('dispute');
    expect(toneOf('COMPLETED')).toBe('completed');
    expect(toneOf('EXPIRED')).toBe('cancelled');
    expect(isClosed('DECLINED')).toBe(true);
    expect(isClosed('RETURNED')).toBe(false);
  });
});

describe('deadlines and dates', () => {
  it('counts down to the second, never showing 0 before the deadline', () => {
    const due = '2026-11-07T10:00:00.000Z';
    expect(remaining(due, Date.parse(due) - (26 * 3600 + 61) * 1000)).toMatchObject({ days: 1, hours: 2, minutes: 1, seconds: 1, overdue: false });
    expect(remaining(due, Date.parse(due) - 1)).toMatchObject({ seconds: 1, overdue: false });
    expect(remaining(due, Date.parse(due))).toMatchObject({ ms: 0, overdue: true });
    expect(tickFor(3_600_000)).toBe(1000);
    expect(tickFor(3_600_001)).toBe(60_000);
  });

  it('formats rental days without shifting them, and counts both ends', () => {
    expect(formatPeriod('2026-11-10', '2026-11-12', 'en')).toBe('10 – 12 Nov 2026');
    expect(formatPeriod('2026-11-10', '2026-11-10', 'en')).toBe('10 Nov 2026');
    expect(daysBetween('2027-03-27', '2027-03-29')).toBe(3);
  });
});

describe('dealTimeline', () => {
  const states = (b: Parameters<typeof dealTimeline>[0], h: Parameters<typeof dealTimeline>[1] = []) =>
    Object.fromEntries(dealTimeline(b, h).map((s) => [s.key, s.state]));

  it('puts a request at the owner’s answer', () => {
    expect(states(testBooking())).toEqual({
      request: 'done',
      answer: 'current',
      sign: 'upcoming',
      pay: 'upcoming',
      handover: 'upcoming',
      return: 'upcoming',
      inspect: 'upcoming',
      end: 'upcoming',
    });
  });

  it('moves from signing to paying once both signed', () => {
    const accepted = testBooking({ status: 'ACCEPTED', hasContract: true, renterSignedAt: '2026-11-06T11:00:00.000Z' });
    expect(states(accepted)).toMatchObject({ answer: 'done', sign: 'current', pay: 'upcoming' });
    const signed = { ...accepted, ownerSignedAt: '2026-11-06T12:00:00.000Z' };
    expect(states(signed)).toMatchObject({ sign: 'done', pay: 'current' });
    expect(dealTimeline(signed).find((s) => s.key === 'sign')!.at).toBe('2026-11-06T12:00:00.000Z');
  });

  it.each([
    ['PAID', 'handover'],
    ['ACTIVE', 'return'],
    ['RETURNED', 'inspect'],
  ] as const)('a %s deal is at %s', (status, key) => {
    expect(states(testBooking({ status, paymentMethod: 'CARD', hasContract: true }))[key]).toBe('current');
  });

  it('adds the damage step and then the dispute after it', () => {
    const damage = { description: 'A crack in the case', photoIds: ['p1'], claimedAt: '2026-11-13T10:00:00.000Z' };
    expect(states(testBooking({ status: 'DAMAGE_CLAIMED', damage }))).toMatchObject({ inspect: 'done', damage: 'current' });
    const disputed = testBooking({
      status: 'DISPUTED',
      damage,
      dispute: { reason: 'DAMAGE', openedAt: '2026-11-13T12:00:00.000Z', note: 'No', resolution: null },
    });
    expect(dealTimeline(disputed).map((s) => s.key)).toEqual(['request', 'answer', 'sign', 'pay', 'handover', 'return', 'inspect', 'damage', 'dispute', 'end']);
    expect(states(disputed)).toMatchObject({ damage: 'done', dispute: 'current' });
  });

  it('puts a dispute about the handover right after the handover', () => {
    const b = testBooking({
      status: 'DISPUTED',
      paymentMethod: 'WALLET',
      dispute: { reason: 'NOT_HANDED_OVER', openedAt: '2026-11-10T12:00:00.000Z', note: 'Nobody came', resolution: null },
    });
    expect(dealTimeline(b).map((s) => s.key).slice(4, 6)).toEqual(['handover', 'dispute']);
    expect(states(b)).toMatchObject({ handover: 'done', dispute: 'current', return: 'upcoming' });
  });

  it('completes every step of a finished deal', () => {
    const b = testBooking({ status: 'COMPLETED', outcome: 'DEPOSIT_REFUNDED', completedAt: '2026-11-14T10:00:00.000Z' });
    expect(new Set(Object.values(states(b)))).toEqual(new Set(['done']));
  });

  it.each([
    ['DECLINED', 'REQUESTED', 'answer'],
    ['EXPIRED', 'ACCEPTED', 'sign'],
    ['CANCELLED', 'PAID', 'handover'],
  ] as const)('stops a %s deal where it ended (from %s)', (status, from, key) => {
    const b = testBooking({ status, hasContract: from !== 'REQUESTED' });
    const h = [historyItem('X', from, status, '2026-11-07T10:00:00.000Z')];
    const s = states(b, h);
    expect(s[key]).toBe('stopped');
    expect(s.end).toBe('stopped');
    expect(s.inspect).toBe('skipped');
  });

  it('takes the times of done steps from the journal', () => {
    const b = testBooking({ status: 'PAID', hasContract: true, paymentMethod: 'CARD' });
    const h = [
      historyItem('REQUEST', null, 'REQUESTED', '2026-11-06T10:00:00.000Z'),
      historyItem('ACCEPT', 'REQUESTED', 'ACCEPTED', '2026-11-06T11:00:00.000Z', 'OWNER'),
      historyItem('PAY', 'ACCEPTED', 'PAID', '2026-11-06T13:00:00.000Z'),
    ];
    const at = Object.fromEntries(dealTimeline(b, h).map((s) => [s.key, s.at]));
    expect(at).toMatchObject({ answer: '2026-11-06T11:00:00.000Z', pay: '2026-11-06T13:00:00.000Z', handover: null });
  });
});
