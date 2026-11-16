import type { Notification } from '@yoyo/shared';
import { describe, expect, it } from 'vitest';
import { notificationHref } from './queries';

const base: Notification = { id: 'n1', kind: 'IDENTITY', event: 'VERIFIED', bookingId: null, listingId: null, title: '', createdAt: '2026-11-16T10:00:00.000Z', readAt: null };

describe('notificationHref for an identity decision', () => {
  it('a confirmation goes home; a refusal goes to the check in Settings', () => {
    expect(notificationHref(base)).toBe('/');
    expect(notificationHref({ ...base, event: 'REJECTED', title: 'Blurry' })).toBe('/settings#identity');
  });
});
