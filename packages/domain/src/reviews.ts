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
