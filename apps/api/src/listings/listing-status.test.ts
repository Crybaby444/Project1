import { LISTING_STATUSES, type ListingStatus } from '@yoyo/shared';
import { describe, expect, it } from 'vitest';
import { nextStatus } from './listing-status';

describe('nextStatus', () => {
  it('sends drafts and rejected listings to review', () => {
    expect(nextStatus('DRAFT', 'submit')).toBe('PENDING_REVIEW');
    expect(nextStatus('REJECTED', 'submit')).toBe('PENDING_REVIEW');
    for (const status of ['PENDING_REVIEW', 'PUBLISHED', 'HIDDEN', 'ARCHIVED'] as const) {
      expect(nextStatus(status, 'submit'), status).toBeNull();
    }
  });

  it('lets moderation decide only on listings in review', () => {
    expect(nextStatus('PENDING_REVIEW', 'approve')).toBe('PUBLISHED');
    expect(nextStatus('PENDING_REVIEW', 'reject')).toBe('REJECTED');
    for (const status of LISTING_STATUSES.filter((s) => s !== 'PENDING_REVIEW')) {
      expect(nextStatus(status, 'approve'), status).toBeNull();
      expect(nextStatus(status, 'reject'), status).toBeNull();
    }
  });

  it('hides published listings and shows hidden ones again', () => {
    expect(nextStatus('PUBLISHED', 'hide')).toBe('HIDDEN');
    expect(nextStatus('HIDDEN', 'unhide')).toBe('PUBLISHED');
    expect(nextStatus('DRAFT', 'hide')).toBeNull();
    expect(nextStatus('PUBLISHED', 'unhide')).toBeNull();
  });

  it('sends content changes of a live listing back to review; price, rules, dates and place need none', () => {
    expect(nextStatus('PUBLISHED', 'edit', 'content')).toBe('PENDING_REVIEW');
    expect(nextStatus('HIDDEN', 'edit', 'content')).toBe('PENDING_REVIEW');
    expect(nextStatus('PUBLISHED', 'edit', 'terms')).toBe('PUBLISHED');
    expect(nextStatus('HIDDEN', 'edit', 'terms')).toBe('HIDDEN');
  });

  it('keeps drafts, rejected listings and listings in review where they are on any edit', () => {
    for (const status of ['DRAFT', 'REJECTED', 'PENDING_REVIEW'] as const) {
      expect(nextStatus(status, 'edit', 'content')).toBe(status);
      expect(nextStatus(status, 'edit', 'terms')).toBe(status);
    }
  });

  it('removes drafts and rejected listings, and archives listings that were live', () => {
    expect(nextStatus('DRAFT', 'delete')).toBe('REMOVED');
    expect(nextStatus('REJECTED', 'delete')).toBe('REMOVED');
    expect(nextStatus('PUBLISHED', 'delete')).toBe('ARCHIVED');
    expect(nextStatus('HIDDEN', 'delete')).toBe('ARCHIVED');
    expect(nextStatus('PENDING_REVIEW', 'delete')).toBe('ARCHIVED');
  });

  it('refuses everything on an archived listing', () => {
    const actions = ['submit', 'approve', 'reject', 'hide', 'unhide', 'delete'] as const;
    for (const action of actions) expect(nextStatus('ARCHIVED' as ListingStatus, action), action).toBeNull();
    expect(nextStatus('ARCHIVED', 'edit', 'content')).toBeNull();
    expect(nextStatus('ARCHIVED', 'edit', 'terms')).toBeNull();
  });
});
