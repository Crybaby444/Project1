import type { ListingStatus } from '@yoyo/shared';

/** What happens to a listing. `edit` is any change by the owner, of content or of terms. */
export type ListingAction = 'submit' | 'approve' | 'reject' | 'hide' | 'unhide' | 'edit' | 'delete';

/**
 * - `content`: what moderation checked — title, description, category, attributes, condition, photos.
 * - `terms`: price, deposit, rental days, rules, place and unavailable dates.
 */
export type EditKind = 'content' | 'terms';

/** `REMOVED`: the listing is deleted for good (it was never public). */
export type NextStatus = ListingStatus | 'REMOVED';

const LIVE: ReadonlySet<ListingStatus> = new Set(['PUBLISHED', 'HIDDEN']);

/**
 * The only table of listing status changes (plan 6, Task 2). Returns the status after `action`, or
 * null when the action is not allowed in `current` (the API answers 409 INVALID_STATUS).
 *
 * | From                       | Action           | To                                   |
 * |----------------------------|------------------|--------------------------------------|
 * | DRAFT, REJECTED            | submit           | PENDING_REVIEW                       |
 * | PENDING_REVIEW             | approve / reject | PUBLISHED / REJECTED                 |
 * | PUBLISHED                  | hide             | HIDDEN                               |
 * | HIDDEN                     | unhide           | PUBLISHED                            |
 * | PUBLISHED, HIDDEN          | edit content     | PENDING_REVIEW                       |
 * | PUBLISHED, HIDDEN          | edit terms       | unchanged                            |
 * | DRAFT, REJECTED, PENDING   | edit             | unchanged (PENDING: submittedAt anew) |
 * | DRAFT, REJECTED            | delete           | REMOVED                              |
 * | PUBLISHED, HIDDEN, PENDING | delete           | ARCHIVED                             |
 * | ARCHIVED                   | anything         | not allowed                          |
 *
 * Whether a deleted listing is removed or archived is finally decided by `publishedAt`: one that was
 * ever published is archived (deals that point at it keep their item), one that never was is removed,
 * whatever its status.
 */
export function nextStatus(current: ListingStatus, action: ListingAction, change?: EditKind): NextStatus | null {
  if (current === 'ARCHIVED') return null;
  switch (action) {
    case 'submit':
      return current === 'DRAFT' || current === 'REJECTED' ? 'PENDING_REVIEW' : null;
    case 'approve':
      return current === 'PENDING_REVIEW' ? 'PUBLISHED' : null;
    case 'reject':
      return current === 'PENDING_REVIEW' ? 'REJECTED' : null;
    case 'hide':
      return current === 'PUBLISHED' ? 'HIDDEN' : null;
    case 'unhide':
      return current === 'HIDDEN' ? 'PUBLISHED' : null;
    case 'edit':
      return LIVE.has(current) && change === 'content' ? 'PENDING_REVIEW' : current;
    case 'delete':
      return current === 'DRAFT' || current === 'REJECTED' ? 'REMOVED' : 'ARCHIVED';
  }
}
