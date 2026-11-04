import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import en from '../../../messages/en.json';
import { apiError, fakeApi, meRoute, testUser, type FakeRoutes } from '@/test/fake-api';
import { renderWithSession } from '@/test/render';
import { ResetPasswordForm } from './ResetPasswordForm';

const replace = vi.fn();
vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/navigation')>()),
  usePathname: () => '/reset-password',
  useRouter: () => ({ replace, push: vi.fn(), refresh: vi.fn() }),
}));

function renderReset(token: string | null, routes: FakeRoutes) {
  const { client, calls } = fakeApi({ ...meRoute(null), ...routes });
  renderWithSession(<ResetPasswordForm token={token} />, { client, hasSession: false });
  return calls;
}

async function fill(password: string, repeat: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(en.auth.fields.newPassword, { exact: true }), password);
  await user.type(screen.getByLabelText(en.auth.fields.repeatPassword), repeat);
  await user.click(screen.getByRole('button', { name: en.auth.reset.submit }));
}

describe('ResetPasswordForm', () => {
  beforeEach(() => replace.mockClear());

  it('checks that both passwords match before sending', async () => {
    const calls = renderReset('tok', {});
    await fill('correct horse battery', 'correct horse batterx');

    const repeat = screen.getByLabelText(en.auth.fields.repeatPassword);
    await waitFor(() =>
      expect(repeat).toHaveAccessibleDescription(expect.stringContaining(en.validation.passwordMismatch)),
    );
    expect(calls.some((c) => c.path === '/api/v1/auth/reset-password')).toBe(false);
  });

  it('sets the password, signs in with it and goes home', async () => {
    const calls = renderReset('tok', {
      'POST /api/v1/auth/reset-password': { status: 200, body: { user: testUser() } },
      'POST /api/v1/auth/login': { status: 200, body: { user: testUser() } },
    });
    await fill('correct horse battery', 'correct horse battery');

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
    expect(calls.find((c) => c.path === '/api/v1/auth/reset-password')?.body).toEqual({
      token: 'tok',
      password: 'correct horse battery',
    });
    expect(calls.find((c) => c.path === '/api/v1/auth/login')?.body).toEqual({
      email: 'anna@mail.lv',
      password: 'correct horse battery',
    });
    expect(await screen.findByText(en.auth.reset.done)).toBeVisible();
  });

  it('explains a used link and offers a new one', async () => {
    renderReset('tok', { 'POST /api/v1/auth/reset-password': apiError(410, 'TOKEN_USED') });
    await fill('correct horse battery', 'correct horse battery');

    expect(await screen.findByRole('heading', { name: en.auth.reset.used.title })).toBeVisible();
    expect(screen.getByRole('link', { name: en.auth.reset.requestNew })).toHaveAttribute(
      'href',
      '/forgot-password',
    );
  });

  it('explains an expired link', async () => {
    renderReset('tok', { 'POST /api/v1/auth/reset-password': apiError(410, 'TOKEN_EXPIRED') });
    await fill('correct horse battery', 'correct horse battery');
    expect(await screen.findByRole('heading', { name: en.auth.reset.expired.title })).toBeVisible();
  });

  it('shows a link without a token as broken right away', () => {
    renderReset(null, {});
    expect(screen.getByRole('heading', { name: en.auth.reset.invalid.title })).toBeVisible();
    expect(screen.queryByLabelText(en.auth.fields.newPassword, { exact: true })).toBeNull();
  });

  it('still says the password changed when signing in afterwards fails, and forgets the old session', async () => {
    const { client } = fakeApi({
      ...meRoute(testUser()),
      'POST /api/v1/auth/reset-password': { status: 200, body: { user: testUser() } },
      'POST /api/v1/auth/login': apiError(429, 'RATE_LIMITED', {}, { 'Retry-After': '60' }),
    });
    const { queryClient } = renderWithSession(<ResetPasswordForm token="tok" />, { client });
    await waitFor(() => expect(queryClient.getQueryData(['session', 'me'])).toBeTruthy()); // signed in here
    await fill('correct horse battery', 'correct horse battery');

    expect(await screen.findByRole('heading', { name: en.auth.reset.changed.title })).toBeVisible();
    expect(queryClient.getQueryData(['session', 'me'])).toBeNull(); // the API ended that session
    expect(screen.getByRole('link', { name: en.auth.reset.signIn })).toHaveAttribute('href', '/login');
    expect(replace).not.toHaveBeenCalled();
  });
});
