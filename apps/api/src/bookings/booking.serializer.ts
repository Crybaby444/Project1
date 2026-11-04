import type { BookingEventType, BookingSnapshot, TimerKind } from '@yoyo/domain';
import type { BookingAction, BookingView } from '@yoyo/shared';
import type { Booking, Listing, ListingPhoto, User } from '../generated/prisma/client';
import type { UrlFor } from '../listings/listing.serializer';

export type BookingWithParties = Booking & {
  listing: Listing & { photos: ListingPhoto[] };
  renter: User;
  owner: User;
  contract: { bookingId: string } | null;
};

export const BOOKING_INCLUDE = {
  listing: { include: { photos: true } },
  renter: true,
  owner: true,
  contract: { select: { bookingId: true } },
} as const;

const iso = (date: Date | undefined | null) => date?.toISOString() ?? null;

/** What a deleted account shows as (its row keeps no name). */
const partyName = (user: User) => (user.deletedAt !== null ? 'Deleted user' : user.name);

export function serializeBooking(
  row: BookingWithParties,
  s: BookingSnapshot,
  viewerRole: BookingView['viewerRole'],
  actions: BookingEventType[],
  urlFor: UrlFor,
): BookingView {
  const cover = [...row.listing.photos].sort((a, b) => a.position - b.position)[0];
  const [timer] = Object.entries(s.timers) as [TimerKind, Date][];
  return {
    id: s.id,
    status: s.status,
    viewerRole,
    listing: {
      id: row.listing.id,
      title: row.listing.title ?? '',
      coverUrl: cover ? urlFor(cover.storageKey, 'thumb') : null,
      city: row.listing.city,
      district: row.listing.district,
    },
    renter: { id: row.renter.id, name: partyName(row.renter) },
    owner: { id: row.owner.id, name: partyName(row.owner) },
    period: { start: s.period.start, end: s.period.end },
    timeZone: s.timeZone,
    message: row.message,
    quote: { ...s.quote },
    renterSignedAt: iso(s.renterSignedAt),
    ownerSignedAt: iso(s.ownerSignedAt),
    paymentMethod: s.paymentMethod ?? null,
    ownerHandedOverAt: iso(s.ownerHandedOverAt),
    renterReceivedAt: iso(s.renterReceivedAt),
    renterReturnedAt: iso(s.renterReturnedAt),
    ownerReceivedBackAt: iso(s.ownerReceivedBackAt),
    declineReason: s.declineReason ?? null,
    damage: s.damage ? { description: s.damage.description, photoIds: [...s.damage.photoIds], claimedAt: s.damage.claimedAt.toISOString() } : null,
    dispute: s.dispute
      ? {
          reason: s.dispute.reason,
          openedAt: s.dispute.openedAt.toISOString(),
          note: s.dispute.note ?? null,
          resolution: s.dispute.resolution
            ? { decision: s.dispute.resolution.decision, comment: s.dispute.resolution.comment, at: s.dispute.resolution.at.toISOString() }
            : null,
        }
      : null,
    cancellation: s.cancellation ? { by: s.cancellation.by, reason: s.cancellation.reason ?? null, at: s.cancellation.at.toISOString() } : null,
    outcome: s.outcome ?? null,
    deadline: timer ? { timer: timer[0], dueAt: timer[1].toISOString() } : null,
    actions: actions.filter((a): a is BookingAction => a !== 'TIMEOUT'),
    hasContract: row.contract !== null,
    version: row.version,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    completedAt: iso(s.completedAt),
  };
}
