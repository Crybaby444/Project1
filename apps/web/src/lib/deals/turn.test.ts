import { describe, expect, it } from 'vitest';
import { testBooking } from '@/test/deals';
import { deadlineKey, isMyTurn, turnKey } from './status';

// The fixture deal runs 10–12 Nov 2026 in Riga.
const at = (iso: string) => new Date(iso);

describe('whose turn and which clock, on each side', () => {
  it('waits for the handover day while a paid deal is days ahead, with no clock on it', () => {
    const paid = testBooking({ status: 'PAID', actions: ['CANCEL'], deadline: { timer: 'HANDOVER_DEADLINE', dueAt: '2026-11-12T22:00:00.000Z' } });
    expect(turnKey(paid, at('2026-11-06T12:00:00Z'))).toBe('waitHandoverDay');
    expect(deadlineKey(paid, at('2026-11-06T12:00:00Z'))).toBeNull();
  });

  it('gives the owner the handover deadline to meet, and the renter what happens if it is missed', () => {
    const deadline = { timer: 'HANDOVER_DEADLINE' as const, dueAt: '2026-11-12T22:00:00.000Z' };
    const day = at('2026-11-10T09:00:00Z');
    expect(deadlineKey(testBooking({ status: 'PAID', viewerRole: 'OWNER', deadline }), day)).toBe('deadline.HANDOVER_DEADLINE');
    expect(deadlineKey(testBooking({ status: 'PAID', viewerRole: 'RENTER', deadline }), day)).toBe('deadlineMissed.HANDOVER_DEADLINE');
    expect(deadlineKey(testBooking({ status: 'REQUESTED', deadline: { timer: 'REQUEST_EXPIRY', dueAt: '2026-11-07T12:00:00.000Z' } }), day)).toBe(
      'deadline.REQUEST_EXPIRY',
    );
  });

  it('is nobody’s turn during a rental before its last day, and the renter’s on it', () => {
    const active = testBooking({ status: 'ACTIVE', actions: ['MARK_RETURNED'] });
    expect(isMyTurn(active, at('2026-11-11T09:00:00Z'))).toBe(false);
    expect(turnKey(active, at('2026-11-11T09:00:00Z'))).toBe('rentalOn');
    expect(turnKey(active, at('2026-11-12T09:00:00Z'))).toBe('yourTurn');
  });
});
