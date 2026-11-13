import { DEFAULT_BOOKING_SETTINGS } from '@yoyo/domain';
import { describe, expect, it } from 'vitest';
import { homeFacts } from './facts';

describe('homeFacts', () => {
  it('reads the five facts from the booking rules', () => {
    expect(homeFacts(DEFAULT_BOOKING_SETTINGS).map(({ value, unit, key }) => [value, unit, key])).toEqual([
      [0, '%', 'fee'],
      [48, 'h', 'inspection'],
      [1, '', 'contract'],
      [100, '%', 'checked'],
      [3, '', 'languages'],
    ]);
  });

  it('carries the fee after the launch offer for the fee line', () => {
    expect(homeFacts(DEFAULT_BOOKING_SETTINGS)[0]!.after).toBe(10);
  });

  it('follows the rules when they change, never a number typed by hand', () => {
    const facts = homeFacts({ ...DEFAULT_BOOKING_SETTINGS, inspectionHours: 72, promoServicePercent: 5, servicePercent: 12 });
    expect(facts[1]!.value).toBe(72);
    expect(facts[0]!.value).toBe(5);
    expect(facts[0]!.after).toBe(12);
  });
});
