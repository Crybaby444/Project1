import { BOOKING_STATUSES as DOMAIN_STATUSES, TIMER_KINDS } from '@yoyo/domain';
import { BOOKING_STATUSES, BOOKING_TIMERS, LEDGER_KINDS } from '@yoyo/shared';
import { describe, expect, it } from 'vitest';
import { $Enums } from '../generated/prisma/client';

describe('lists shared by the domain, the API contract and the database', () => {
  it('agree on statuses, timers and ledger kinds', () => {
    expect([...BOOKING_STATUSES]).toEqual([...DOMAIN_STATUSES]);
    expect(Object.keys($Enums.BookingStatus)).toEqual([...DOMAIN_STATUSES]);
    expect([...BOOKING_TIMERS]).toEqual([...TIMER_KINDS]);
    expect(Object.keys($Enums.TimerKind)).toEqual([...TIMER_KINDS]);
    expect(Object.keys($Enums.LedgerKind)).toEqual([...LEDGER_KINDS]);
  });
});
