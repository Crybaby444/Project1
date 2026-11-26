import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import admin from '../../../../messages/admin/en.json';
import { fakeApi, meRoute, testUser } from '@/test/fake-api';
import { renderWithSession } from '@/test/render';
import { CommandPalette } from './CommandPalette';

const push = vi.fn();
vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/navigation')>()),
  usePathname: () => '/admin',
  useRouter: () => ({ replace: vi.fn(), push, refresh: vi.fn() }),
}));

const t = admin.admin.search;

describe('CommandPalette', () => {
  it('opens on ⌘K, searches people, items and deals, and opens the chosen one with Enter', async () => {
    const api = fakeApi({
      ...meRoute(testUser({ role: 'ADMIN' })),
      'GET /api/v1/admin/search': {
        status: 200,
        body: {
          users: [{ id: 'u1', name: 'Olga Kalniņa', email: 'olga@x.lv', blocked: false }],
          listings: [{ id: 'l1', title: 'Drill', status: 'PUBLISHED', owner: 'Olga' }],
          deals: [],
        },
      },
    });
    renderWithSession(<CommandPalette />, { client: api.client });
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
    });
    const dialog = await screen.findByRole('dialog', { name: t.open });
    await userEvent.type(within(dialog).getByRole('combobox'), 'olga');
    expect(await within(dialog).findByRole('option', { name: /Olga Kalniņa/ })).toBeInTheDocument();
    expect(within(dialog).getByRole('option', { name: /Drill/ })).toBeInTheDocument();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin/users/u1'));
  });
});
