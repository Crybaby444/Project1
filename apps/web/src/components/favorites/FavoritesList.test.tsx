import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import en from '../../../messages/en.json';
import { catalogItem } from '@/test/catalog';
import { fakeApi, meRoute, testUser } from '@/test/fake-api';
import { renderWithSession } from '@/test/render';
import { FavoritesList } from './FavoritesList';

vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/navigation')>()),
  usePathname: () => '/search',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

describe('FavoritesList', () => {
  it('lists favourites and marks one that left the catalog', async () => {
    const api = fakeApi({
      ...meRoute(testUser()),
      'GET /api/v1/me/favorites': {
        status: 200,
        body: { items: [{ ...catalogItem(), available: true }, { ...catalogItem({ id: 'cm2abcdefg', title: 'Old tent' }), available: false }] },
      },
      'GET /api/v1/me/favorites/ids': { status: 200, body: { ids: ['cm1abcdefg', 'cm2abcdefg'] } },
    });
    renderWithSession(<FavoritesList />, { client: api.client });
    expect(await screen.findByRole('link', { name: 'Cordless drill' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Old tent' })).toBeInTheDocument();
    expect(screen.getAllByText(en.catalog.card.unavailable)).toHaveLength(1);
  });

  it('invites to the catalog when there are none', async () => {
    const api = fakeApi({ ...meRoute(testUser()), 'GET /api/v1/me/favorites': { status: 200, body: { items: [] } } });
    renderWithSession(<FavoritesList />, { client: api.client });
    expect(await screen.findByText(en.favorites.emptyTitle)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: en.favorites.browse })).toHaveAttribute('href', '/c');
  });
});
