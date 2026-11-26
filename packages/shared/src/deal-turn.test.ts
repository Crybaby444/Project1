import { describe, expect, it } from 'vitest';
import { waitsForStep } from './bookings';

const deal = (status: string, actions: string[], end = '2026-11-12') => ({ status, actions, period: { end } });

describe('waitsForStep', () => {
  it('counts a step that moves the deal, not a way out', () => {
    expect(waitsForStep(deal('REQUESTED', ['ACCEPT', 'DECLINE']), '2026-11-06')).toBe(true);
    expect(waitsForStep(deal('REQUESTED', ['WITHDRAW']), '2026-11-06')).toBe(false);
    expect(waitsForStep(deal('PAID', ['CANCEL']), '2026-11-06')).toBe(false);
    expect(waitsForStep(deal('DISPUTED', ['RESOLVE']), '2026-11-06')).toBe(false);
  });

  it('is nobody’s turn during a rental until its last day', () => {
    expect(waitsForStep(deal('ACTIVE', ['MARK_RETURNED']), '2026-11-11')).toBe(false);
    expect(waitsForStep(deal('ACTIVE', ['MARK_RETURNED']), '2026-11-12')).toBe(true);
    expect(waitsForStep(deal('ACTIVE', ['CONFIRM_RETURNED', 'REPORT_NOT_RETURNED']), '2026-11-13')).toBe(true);
  });
});
