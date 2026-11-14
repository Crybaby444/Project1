import type { BookingSnapshot } from './booking/types';
import type { BookingSettings } from './settings';

const DAY_MS = 86_400_000;

/**
 * Both sides may review each other once a deal is completed, for `reviewWindowDays` days counted in
 * exact 24-hour days from `completedAt` (spec §4.4, step 8).
 */
export function canReview(snapshot: BookingSnapshot, now: Date, settings: BookingSettings): boolean {
  if (snapshot.status !== 'COMPLETED' || snapshot.completedAt === undefined) return false;
  return now.getTime() <= snapshot.completedAt.getTime() + settings.reviewWindowDays * DAY_MS;
}

/**
 * Blind reviews: a review shows only once the other side of the deal has reviewed too, or once the
 * review window has closed — so nobody writes theirs in answer to the other's.
 */
export function reviewIsPublic(input: { completedAt: Date; now: Date; windowDays: number; otherSideReviewed: boolean }): boolean {
  if (input.otherSideReviewed) return true;
  return input.now.getTime() > input.completedAt.getTime() + input.windowDays * DAY_MS;
}

/** When the review window of a deal completed at `completedAt` closes. */
export function reviewDeadline(completedAt: Date, windowDays: number): Date {
  return new Date(completedAt.getTime() + windowDays * DAY_MS);
}
