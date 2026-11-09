import type { BookingHistoryItem, BookingView } from '@yoyo/shared';

/** 3 days at 15 €, 10 % fee, 100 € deposit (the domain README's example), seen by the renter. */
export function testBooking(overrides: Partial<BookingView> = {}): BookingView {
  return {
    id: 'booking-1',
    status: 'REQUESTED',
    viewerRole: 'RENTER',
    listing: { id: 'listing-1', title: 'PlayStation 5', coverUrl: null, city: 'Rīga', district: 'Centrs' },
    renter: { id: 'user-1', name: 'Anna Bērziņa' },
    owner: { id: 'owner-1', name: 'Andris Kalniņš' },
    period: { start: '2026-11-10', end: '2026-11-12' },
    timeZone: 'Europe/Riga',
    message: null,
    quote: {
      days: 3,
      dailyCents: 1500,
      baseCents: 4500,
      discountPercent: 0,
      discountCents: 0,
      rentCents: 4500,
      servicePercent: 10,
      serviceFeeCents: 450,
      servicePromoUntil: null,
      depositCents: 10000,
      totalCents: 14950,
      ownerPayoutCents: 4500,
      priceSource: 'LISTED',
    },
    renterSignedAt: null,
    ownerSignedAt: null,
    paymentMethod: null,
    ownerHandedOverAt: null,
    renterReceivedAt: null,
    renterReturnedAt: null,
    ownerReceivedBackAt: null,
    declineReason: null,
    damage: null,
    dispute: null,
    cancellation: null,
    outcome: null,
    deadline: { timer: 'REQUEST_EXPIRY', dueAt: '2026-11-07T10:00:00.000Z' },
    actions: ['WITHDRAW'],
    hasContract: false,
    version: 0,
    createdAt: '2026-11-06T10:00:00.000Z',
    updatedAt: '2026-11-06T10:00:00.000Z',
    completedAt: null,
    ...overrides,
  };
}

export const historyItem = (
  type: string,
  fromStatus: BookingHistoryItem['fromStatus'],
  toStatus: BookingHistoryItem['toStatus'],
  at: string,
  actor: BookingHistoryItem['actor'] = 'RENTER',
): BookingHistoryItem => ({ type, actor, fromStatus, toStatus, at });
