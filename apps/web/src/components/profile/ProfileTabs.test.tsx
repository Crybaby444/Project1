import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import en from '../../../messages/en.json';
import { catalogItem } from '@/test/catalog';
import { fakeApi, meRoute, testUser } from '@/test/fake-api';
import { renderWithSession } from '@/test/render';
import { ProfileTabs } from './ProfileTabs';

vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/navigation')>()),
  usePathname: () => '/search',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

describe('ProfileTabs', () => {
  it('shows the items, and the reviews placeholder; arrows move between the tabs', async () => {
    const user = userEvent.setup();
    const api = fakeApi({
      ...meRoute(null),
      'GET /api/v1/users/owner-1/shops': { status: 200, body: { items: [] } },
      'GET /api/v1/users/owner-1/reviews': { status: 200, body: { items: [], total: 0, page: 1, pageSize: 10, average: 0 } },
    });
    renderWithSession(<ProfileTabs listings={[catalogItem()]} name="Jānis" userId="owner-1" />, { client: api.client, hasSession: false });
    const items = screen.getByRole('tab', { name: /^Items\s*1$/ });
    expect(items).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('link', { name: 'Cordless drill' })).toBeVisible();
    items.focus();
    await user.keyboard('{ArrowRight}');
    const shops = screen.getByRole('tab', { name: new RegExp(`^${en.profile.shops}`) });
    expect(shops).toHaveFocus();
    expect(await screen.findByText(en.profile.noShops.replace('{name}', 'Jānis'))).toBeVisible();
    await user.keyboard('{ArrowRight}');
    const reviews = screen.getByRole('tab', { name: new RegExp(`^${en.profile.reviews}`) });
    expect(reviews).toHaveFocus();
    expect(reviews).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByText(en.profile.noReviewsTitle)).toBeVisible();
  });

  it('your own profile manages everything: drafts in Items, and ?tab= opens a tab (no separate dashboard, 2026-11-19)', async () => {
    const me = testUser({ id: 'me-1' });
    const draft = {
      id: 'l1', status: 'DRAFT', title: 'Bosch drill draft', categoryId: null, dailyCents: 800, cover: null, photoCount: 0,
      rejectionReason: null, submittedAt: null, publishedAt: null, updatedAt: '2026-11-04T10:00:00.000Z', version: 1,
      activity: { requests: 0, nextStart: null, earnedCents: 0 },
    };
    const api = fakeApi({
      ...meRoute(me),
      'GET /api/v1/me/listings': { status: 200, body: { items: [draft] } },
      'GET /api/v1/me/favorites': { status: 200, body: { items: [] } },
      'GET /api/v1/me/favorites/ids': { status: 200, body: { ids: [] } },
      'GET /api/v1/me/following': { status: 200, body: { items: [] } },
      'GET /api/v1/me/following/ids': { status: 200, body: { ids: [] } },
      'GET /api/v1/me/following/feed': { status: 200, body: { items: [], total: 0 } },
    });
    window.history.replaceState(null, '', '/u/me-1');
    const { unmount } = renderWithSession(<ProfileTabs listings={[]} name="Me" userId="me-1" />, { client: api.client });
    expect(await screen.findByText('Bosch drill draft')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: new RegExp(`^${en.profile.myItems}`) })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: new RegExp(`^${en.profile.following}`) })).toBeInTheDocument();
    unmount();

    window.history.replaceState(null, '', '/u/me-1?tab=following');
    renderWithSession(<ProfileTabs listings={[]} name="Me" userId="me-1" />, { client: api.client });
    expect(await screen.findByRole('tab', { name: en.profile.following, selected: true })).toBeInTheDocument();
    window.history.replaceState(null, '', '/');
  });
});
