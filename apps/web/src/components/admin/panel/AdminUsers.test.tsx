import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AdminUser } from '@yoyo/shared';
import { describe, expect, it, vi } from 'vitest';
import admin from '../../../../messages/admin/en.json';
import { fakeApi, meRoute, testUser } from '@/test/fake-api';
import { renderWithSession } from '@/test/render';
import { AdminUsers } from './AdminUsers';

vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/navigation')>()),
  usePathname: () => '/admin/users',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

const t = admin.admin.users;
const person = (over: Partial<AdminUser>): AdminUser => ({ ...testUser(over), blockedAt: null, deletedAt: null, ...over });

describe('AdminUsers', () => {
  it('blocks a user after a confirmation, and never offers to block an admin', async () => {
    const rita = person({ id: 'u2', name: 'Rita', email: 'rita@mail.lv' });
    const api = fakeApi({
      ...meRoute(testUser({ role: 'ADMIN' })),
      'GET /api/v1/admin/users': { status: 200, body: { items: [rita, person({ id: 'u3', name: 'Ada', role: 'ADMIN' })], total: 2 } },
      'POST /api/v1/admin/users/u2/block': { status: 200, body: { user: { ...rita, blockedAt: '2026-11-14T10:00:00.000Z' } } },
    });
    renderWithSession(<AdminUsers search="" page={1} />, { client: api.client });
    const table = await screen.findByRole('table');
    const adaRow = within(table).getByText('Ada').closest('tr')!;
    expect(within(adaRow).queryByRole('button')).toBeNull();

    await userEvent.click(within(table).getByRole('button', { name: `${t.block} Rita` }));
    const dialog = await screen.findByRole('dialog', { name: 'Block Rita?' });
    expect(api.calls.some((c) => c.path.endsWith('/block'))).toBe(false);
    await userEvent.click(within(dialog).getByRole('button', { name: t.block }));
    await waitFor(() => expect(api.calls.some((c) => c.method === 'POST' && c.path.endsWith('/u2/block'))).toBe(true));
  });
});
