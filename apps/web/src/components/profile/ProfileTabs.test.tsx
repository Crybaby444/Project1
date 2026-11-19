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
    const items = screen.getByRole('tab', { name: '1 item' });
    expect(items).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('link', { name: 'Cordless drill' })).toBeVisible();
    items.focus();
    await user.keyboard('{ArrowRight}');
    const shops = screen.getByRole('tab', { name: en.profile.shops });
    expect(shops).toHaveFocus();
    expect(await screen.findByText(en.profile.noShops.replace('{name}', 'Jānis'))).toBeVisible();
    await user.keyboard('{ArrowRight}');
    const reviews = screen.getByRole('tab', { name: en.profile.reviews });
    expect(reviews).toHaveFocus();
    expect(reviews).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByText(en.profile.noReviewsTitle)).toBeVisible();
  });

  it('on your own profile, holds your items, favourites, following and shops, and opens the tab from the address', async () => {
    const user = userEvent.setup();
    const api = fakeApi({
      ...meRoute(testUser()),
      'GET /api/v1/me/listings': { status: 200, body: { items: [] } },
      'GET /api/v1/me/favorites': { status: 200, body: { items: [] } },
      'GET /api/v1/me/favorites/ids': { status: 200, body: { ids: [] } },
      'GET /api/v1/me/following': { status: 200, body: { items: [] } },
      'GET /api/v1/me/following/ids': { status: 200, body: { ids: [] } },
      'GET /api/v1/me/following/feed': { status: 200, body: { items: [], total: 0 } },
    });
    renderWithSession(<ProfileTabs listings={[]} name="Anna" userId="user-1" initialTab="favorites" />, { client: api.client });
    const favorites = await screen.findByRole('tab', { name: en.mySpace.tabs.favorites });
    expect(favorites).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: en.mySpace.tabs.lending })).toBeVisible();
    expect(screen.getByRole('tab', { name: en.mySpace.tabs.following })).toBeVisible();
    expect(screen.getByRole('tab', { name: en.mySpace.tabs.shops })).toBeVisible();
    expect(await screen.findByText(en.favorites.emptyTitle)).toBeVisible();
    await user.click(screen.getByRole('tab', { name: en.mySpace.tabs.lending }));
    expect(await screen.findByText(en.myListings.emptyTitle)).toBeVisible();
    expect(window.location.search).not.toContain('tab=');
  });

  it("on someone else's profile, a tab only the owner has falls back to the items", () => {
    const api = fakeApi({ ...meRoute(null) });
    renderWithSession(<ProfileTabs listings={[catalogItem()]} name="Jānis" userId="owner-1" initialTab="favorites" />, { client: api.client, hasSession: false });
    expect(screen.getByRole('tab', { name: '1 item' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByRole('tab', { name: en.mySpace.tabs.favorites })).toBeNull();
  });
});
