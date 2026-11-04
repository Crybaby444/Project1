import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import en from '../../../messages/en.json';
import ru from '../../../messages/ru.json';
import { apiError, fakeApi, meRoute, testUser, type FakeRoutes } from '@/test/fake-api';
import { renderWithSession } from '@/test/render';
import { SecuritySettings } from './SecuritySettings';

const replace = vi.fn();
vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/navigation')>()),
  usePathname: () => '/settings/security',
  useRouter: () => ({ replace, push: vi.fn(), refresh: vi.fn() }),
}));

const s = en.settings.security;

function renderSecurity(
  user: ReturnType<typeof testUser>,
  routes: FakeRoutes = {},
  locale: 'en' | 'ru' = 'en',
) {
  const { client, calls } = fakeApi({
    ...meRoute(user),
    'GET /api/v1/auth/providers': { status: 200, body: { google: true, phone: false } },
    ...routes,
  });
  renderWithSession(<SecuritySettings user={user} />, { client, locale });
  return calls;
}

describe('SecuritySettings', () => {
  beforeEach(() => replace.mockClear());

  it('changes the password with the current one', async () => {
    const user = userEvent.setup();
    const calls = renderSecurity(testUser(), {
      'POST /api/v1/me/password': { status: 200, body: { user: testUser() } },
    });

    await user.type(screen.getByLabelText(en.auth.fields.currentPassword), 'correct horse');
    await user.type(
      screen.getByLabelText(en.auth.fields.newPassword, { exact: true }),
      'a brand new passphrase',
    );
    await user.type(screen.getByLabelText(en.auth.fields.repeatPassword), 'a brand new passphrase');
    await user.click(screen.getByRole('button', { name: s.password.submit }));

    expect(await screen.findByText(s.password.changed)).toBeVisible();
    expect(calls.find((c) => c.path === '/api/v1/me/password')?.body).toEqual({
      currentPassword: 'correct horse',
      newPassword: 'a brand new passphrase',
    });
  });

  it('marks a wrong current password at that field', async () => {
    const user = userEvent.setup();
    renderSecurity(testUser(), { 'POST /api/v1/me/password': apiError(401, 'AUTH_INVALID_CREDENTIALS') });

    await user.type(screen.getByLabelText(en.auth.fields.currentPassword), 'nope');
    await user.type(
      screen.getByLabelText(en.auth.fields.newPassword, { exact: true }),
      'a brand new passphrase',
    );
    await user.type(screen.getByLabelText(en.auth.fields.repeatPassword), 'a brand new passphrase');
    await user.click(screen.getByRole('button', { name: s.password.submit }));

    const current = screen.getByLabelText(en.auth.fields.currentPassword);
    await waitFor(() =>
      expect(current).toHaveAccessibleDescription(expect.stringContaining(s.password.wrongCurrent)),
    );
  });

  it('for a Google-only account explains there is no password, and deletion asks for none (Review Focus 4)', async () => {
    const user = userEvent.setup();
    const calls = renderSecurity(testUser({ hasPassword: false }), { 'DELETE /api/v1/me': { status: 204 } });

    expect(screen.getByText(s.password.google)).toBeVisible();
    expect(screen.queryByLabelText(en.auth.fields.currentPassword)).toBeNull();

    await user.click(screen.getByRole('button', { name: s.delete.open }));
    const dialog = screen.getByRole('dialog', { name: s.delete.title });
    expect(within(dialog).queryByLabelText(en.auth.fields.password)).toBeNull();
    await user.type(
      within(dialog).getByLabelText(s.delete.confirmLabel.replace('{word}', s.delete.word)),
      s.delete.word,
    );
    await user.click(within(dialog).getByRole('button', { name: s.delete.submit }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
    expect(calls.find((c) => c.method === 'DELETE')?.body).toEqual({});
  });

  it('deletes an account with a password only after the word and the password', async () => {
    const user = userEvent.setup();
    const calls = renderSecurity(testUser(), {}, 'ru');
    const d = ru.settings.security.delete;

    await user.click(screen.getByRole('button', { name: d.open }));
    const dialog = screen.getByRole('dialog', { name: d.title });
    const submit = within(dialog).getByRole('button', { name: d.submit });
    expect(submit).toBeDisabled();

    await user.type(
      within(dialog).getByLabelText(d.confirmLabel.replace('{word}', d.word)),
      d.word.toLowerCase(),
    );
    expect(submit).toBeEnabled(); // the word is checked without regard to letter case
    await user.click(submit);
    expect(await within(dialog).findByText(ru.validation.required)).toBeVisible();
    expect(calls.some((c) => c.method === 'DELETE')).toBe(false);
  });

  it('signs out everywhere after confirming in a dialog', async () => {
    const user = userEvent.setup();
    const calls = renderSecurity(testUser(), { 'POST /api/v1/auth/logout-all': { status: 204 } });

    await user.click(screen.getByRole('button', { name: s.logoutAll.open }));
    const dialog = screen.getByRole('dialog', { name: s.logoutAll.title });
    await user.click(within(dialog).getByRole('button', { name: s.logoutAll.submit }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
    expect(calls.some((c) => c.path === '/api/v1/auth/logout-all')).toBe(true);
  });

  it('does not offer phone confirmation while the deployment has no SMS', async () => {
    renderSecurity(testUser());
    await waitFor(() => expect(screen.getByRole('button', { name: s.delete.open })).toBeVisible());
    expect(screen.queryByRole('heading', { name: /phone/i })).toBeNull();
    expect(document.querySelector('input[type="tel"]')).toBeNull();
  });
});
