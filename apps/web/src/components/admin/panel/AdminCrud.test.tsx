import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import '@/test/dialog';
import admin from '../../../../messages/admin/en.json';
import { apiError, fakeApi, meRoute, testUser } from '@/test/fake-api';
import { renderWithSession } from '@/test/render';
import { AddPersonButton, DeleteCategoryButton } from './AdminCrud';

const push = vi.fn();
vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/navigation')>()),
  usePathname: () => '/admin/users',
  useRouter: () => ({ replace: vi.fn(), push, refresh: vi.fn() }),
}));

const t = admin.admin.crud;

describe('admin add / delete dialogs', () => {
  it('adds a person without a password and opens their page', async () => {
    const user = userEvent.setup();
    const api = fakeApi({
      ...meRoute(testUser({ role: 'ADMIN', staffRole: 'OWNER' })),
      'POST /api/v1/admin/users': (body) =>
        (body as { email: string }).email === 'taken@mail.lv'
          ? apiError(409, 'AUTH_EMAIL_TAKEN')
          : { status: 201, body: { id: 'u9', passwordLinkSent: true } },
    });
    renderWithSession(<AddPersonButton />, { client: api.client });
    await user.click(screen.getByRole('button', { name: t.addPerson }));
    const dialog = screen.getByRole('dialog', { name: t.addPerson });
    await user.type(within(dialog).getByLabelText(t.name), 'Lina');
    await user.type(within(dialog).getByLabelText(t.email), 'taken@mail.lv');
    await user.click(within(dialog).getByRole('button', { name: t.add }));
    expect(await within(dialog).findByText(t.emailTaken)).toBeInTheDocument();
    await user.clear(within(dialog).getByLabelText(t.email));
    await user.type(within(dialog).getByLabelText(t.email), 'lina@mail.lv');
    await user.click(within(dialog).getByRole('button', { name: t.add }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin/users/u9'));
    expect(api.calls.filter((c) => c.method === 'POST').at(-1)?.body).toEqual({
      name: 'Lina',
      email: 'lina@mail.lv',
      locale: 'lv',
    });
  });

  it('asks where the listings go before deleting a category that has some', async () => {
    const user = userEvent.setup();
    const api = fakeApi({
      ...meRoute(testUser({ role: 'ADMIN', staffRole: 'OWNER' })),
      'DELETE /api/v1/admin/categories/c1': { status: 204 },
    });
    renderWithSession(
      <DeleteCategoryButton
        category={{ id: 'c1', names: { en: 'Drills', lv: 'Urbji', ru: 'Дрели' }, allListings: 3 }}
        targets={[
          { id: 'c1', label: 'Tools → Drills' },
          { id: 'c2', label: 'Tools → Saws' },
        ]}
      />,
      { client: api.client },
    );
    await user.click(screen.getByRole('button', { name: t.delete }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: t.deleteYes }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent(t.chooseTarget);
    await user.click(within(dialog).getByRole('combobox', { name: t.moveTo }));
    expect(screen.queryByRole('option', { name: 'Tools → Drills' })).toBeNull(); // not into itself
    await user.click(screen.getByRole('option', { name: 'Tools → Saws' }));
    await user.click(within(dialog).getByRole('button', { name: t.deleteYes }));
    await waitFor(() =>
      expect(api.calls.some((c) => c.method === 'DELETE' && c.query === 'moveTo=c2')).toBe(true),
    );
  });
});
