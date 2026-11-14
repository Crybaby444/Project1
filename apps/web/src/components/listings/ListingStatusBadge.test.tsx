import { screen } from '@testing-library/react';
import { LISTING_STATUSES } from '@yoyo/shared';
import { describe, expect, it } from 'vitest';
import en from '../../../messages/en.json';
import ru from '../../../messages/ru.json';
import { renderWithIntl } from '@/test/render';
import { ListingStatusBadge } from './ListingStatusBadge';

describe('ListingStatusBadge', () => {
  it.each(LISTING_STATUSES)('names %s in words, with an icon', (status) => {
    renderWithIntl(<ListingStatusBadge status={status} />);
    const badge = screen.getByText(en.listingStatus[status]);
    expect(badge.closest('[data-status]')).toHaveAttribute('data-status', status);
    expect(badge.closest('[data-status]')?.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('is black and white (owner, 2026-11-13): no fill colour, a different look for each live state', () => {
    const looks = new Set<string>();
    for (const status of ['PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'HIDDEN'] as const) {
      const { container, unmount } = renderWithIntl(<ListingStatusBadge status={status} />);
      const badge = container.firstElementChild as HTMLElement;
      expect(badge.style.backgroundColor).toBe('');
      looks.add(badge.dataset.tone ?? '');
      unmount();
    }
    expect(looks.size).toBe(4);
  });

  it('speaks the page language', () => {
    renderWithIntl(<ListingStatusBadge status="PENDING_REVIEW" />, 'ru');
    expect(screen.getByText(ru.listingStatus.PENDING_REVIEW)).toBeVisible();
  });
});
