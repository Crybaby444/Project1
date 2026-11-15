import { describe, expect, it } from 'vitest';
import { adminMayStay } from './admin-only';

describe('adminMayStay', () => {
  it('keeps an administrator in the panel and on the pages it links to for checks', () => {
    for (const path of ['/admin', '/admin/deals/b1', '/listings/cm1abc-drill', '/bookings/b1', '/u/u1', '/terms', '/privacy', '/cookies', '/settings/security']) {
      expect(adminMayStay(path), path).toBe(true);
    }
  });

  it('sends them away from everything made for renters and owners', () => {
    for (const path of ['/', '/c', '/c/tools', '/search', '/bookings', '/wallet', '/messages', '/messages/c1', '/notifications', '/dashboard/lending', '/dashboard/favorites', '/listings/new', '/listings/l1/edit', '/items/l1/book', '/settings', '/how-it-works']) {
      expect(adminMayStay(path), path).toBe(false);
    }
  });
});
