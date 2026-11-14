import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import en from '../../../messages/en.json';
import { catalogItem } from '@/test/catalog';
import { fakeApi, meRoute } from '@/test/fake-api';
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
      'GET /api/v1/users/owner-1/reviews': { status: 200, body: { items: [], total: 0, page: 1, pageSize: 10, average: 0 } },
    });
    renderWithSession(<ProfileTabs listings={[catalogItem()]} name="Jānis" userId="owner-1" />, { client: api.client, hasSession: false });
    const items = screen.getByRole('tab', { name: '1 item' });
    expect(items).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('link', { name: 'Cordless drill' })).toBeVisible();
    items.focus();
    await user.keyboard('{ArrowRight}');
    const reviews = screen.getByRole('tab', { name: en.profile.reviews });
    expect(reviews).toHaveFocus();
    expect(reviews).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByText(en.profile.noReviewsTitle)).toBeVisible();
  });
});
