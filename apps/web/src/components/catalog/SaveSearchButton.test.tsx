import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import en from '../../../messages/en.json';
import { fakeApi, meRoute, testUser } from '@/test/fake-api';
import { renderWithSession } from '@/test/render';
import { SaveSearchButton } from './SaveSearchButton';

const push = vi.fn();
vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/navigation')>()),
  usePathname: () => '/search',
  useRouter: () => ({ replace: vi.fn(), push, refresh: vi.fn() }),
}));

const t = en.catalog.saveSearch;

describe('SaveSearchButton', () => {
  it('saves the current filters (prices in cents) and then says it will tell about new items', async () => {
    const api = fakeApi({
      ...meRoute(testUser()),
      'POST /api/v1/me/saved-searches': (body) => ({ status: 201, body: { search: { id: 's1', q: null, category: null, priceMax: null, district: null, createdAt: '2026-11-15T10:00:00.000Z', ...(body as object) } } }),
    });
    renderWithSession(<SaveSearchButton query={{ q: 'drill', priceMax: 20, category: 'tools' }} />, { client: api.client });
    await userEvent.click(await screen.findByRole('button', { name: t.save }));
    await waitFor(() => expect(api.calls.find((c) => c.method === 'POST')?.body).toEqual({ q: 'drill', priceMax: 2000, category: 'tools' }));
    expect(await screen.findByText(t.saved)).toBeInTheDocument();
  });

  it('sends a visitor to sign in first', async () => {
    renderWithSession(<SaveSearchButton query={{ q: 'drill' }} />, { client: fakeApi(meRoute(null)).client, hasSession: false });
    await userEvent.click(await screen.findByRole('button', { name: t.save }));
    expect(push).toHaveBeenCalledWith(expect.stringContaining('/login?next='));
  });

  it('has nothing to save without a filter', () => {
    renderWithSession(<SaveSearchButton query={{}} />, { client: fakeApi(meRoute(null)).client, hasSession: false });
    expect(screen.queryByRole('button', { name: t.save })).toBeNull();
  });
});
