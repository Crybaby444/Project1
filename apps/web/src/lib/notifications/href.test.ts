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

describe('notificationHref for a price offer', () => {
  it('a new offer goes to the owner\'s offers in "My deals"; an answer goes back to the item, to book', () => {
    const offer = { ...base, kind: 'OFFER' as const, listingId: 'listing-1', title: 'Drill' };
    expect(notificationHref({ ...offer, event: 'OFFER_MADE' })).toBe('/bookings?role=owner');
    expect(notificationHref({ ...offer, event: 'OFFER_ACCEPTED' })).toBe('/listings/listing-1');
    expect(notificationHref({ ...offer, event: 'OFFER_DECLINED' })).toBe('/listings/listing-1');
  });
});
