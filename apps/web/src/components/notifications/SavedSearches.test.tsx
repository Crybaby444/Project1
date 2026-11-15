import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import deals from '../../../messages/deals/en.json';
import { fakeApi, meRoute, testUser } from '@/test/fake-api';
import { testCategories } from '@/test/listings';
import { renderWithSession } from '@/test/render';
import { SavedSearches } from './SavedSearches';

vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/navigation')>()),
  usePathname: () => '/notifications',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

const t = deals.notifications.searches;

describe('SavedSearches', () => {
  it('lists saved searches in words, each a link to the search, and deletes one', async () => {
    const cat = testCategories[0]!;
    const api = fakeApi({
      ...meRoute(testUser()),
      'GET /api/v1/categories': { status: 200, body: { categories: testCategories } },
      'GET /api/v1/me/saved-searches': {
        status: 200,
        body: { items: [{ id: 's1', q: 'drill', category: cat.slug, priceMax: 2000, district: null, createdAt: '2026-11-15T10:00:00.000Z' }] },
      },
      'DELETE /api/v1/me/saved-searches/s1': { status: 204 },
    });
    renderWithSession(<SavedSearches />, { client: api.client });
    const list = await screen.findByRole('list', { name: t.title });
    const link = within(list).getByRole('link');
    expect(link).toHaveTextContent('“drill”');
    expect(link).toHaveTextContent(cat.names.en);
    expect(link).toHaveTextContent('up to €20');
    expect(link.getAttribute('href')).toContain('q=drill');
    expect(link.getAttribute('href')).toContain('price_max=20');
    await userEvent.click(within(list).getByRole('button', { name: t.remove }));
    await waitFor(() => expect(api.calls.some((c) => c.method === 'DELETE')).toBe(true));
  });
});
