import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import en from '../../../messages/en.json';
import { apiError, fakeApi, meRoute, testUser, type FakeRoutes } from '@/test/fake-api';
import { renderWithSession } from '@/test/render';
import { LoginForm } from './LoginForm';

const replace = vi.fn();
vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/navigation')>()),
  usePathname: () => '/login',
  useRouter: () => ({ replace, push: vi.fn(), refresh: vi.fn() }),
}));

const providers = (google: boolean): FakeRoutes => ({
  'GET /api/v1/auth/providers': { status: 200, body: { google, phone: false } },
});

function renderLogin(
  routes: FakeRoutes,
  props: Partial<Parameters<typeof LoginForm>[0]> = {},
  signedIn = false,
) {
  const { client, calls } = fakeApi({
    ...meRoute(signedIn ? testUser() : null),
    ...providers(false),
    ...routes,
  });
  renderWithSession(<LoginForm next={null} oauthError={null} {...props} />, { client, hasSession: signedIn });
  return calls;
}

const email = () => screen.getByLabelText(en.auth.fields.email);
const password = () => screen.getByLabelText(en.auth.fields.password);
const submit = () => screen.getByRole('button', { name: en.auth.login.submit });

describe('LoginForm', () => {
  beforeEach(() => replace.mockClear());
  afterEach(() => vi.useRealTimers());

  it('marks both empty fields and moves the focus to the email', async () => {
    const user = userEvent.setup();
    const calls = renderLogin({});

    await user.click(submit());

    await waitFor(() => expect(email()).toHaveFocus());
    expect(email()).toHaveAttribute('aria-invalid', 'true');
    expect(password()).toHaveAttribute('aria-invalid', 'true');
    expect(email()).toHaveAccessibleDescription(expect.stringContaining(en.validation.required));
    expect(calls.some((c) => c.path === '/api/v1/auth/login')).toBe(false);
  });

  it('shows a wrong password above the form in the visitor’s words', async () => {
    const user = userEvent.setup();
    renderLogin({ 'POST /api/v1/auth/login': apiError(401, 'AUTH_INVALID_CREDENTIALS') });

    await user.type(email(), 'anna@mail.lv');
    await user.type(password(), 'not my password');
    await user.click(submit());

    expect(await screen.findByRole('alert')).toHaveTextContent(en.errors.AUTH_INVALID_CREDENTIALS);
    expect(replace).not.toHaveBeenCalled();
  });

  it('after a 429 counts Retry-After down with the button off, then lets the person try again', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderLogin({
      'POST /api/v1/auth/login': apiError(429, 'RATE_LIMITED', {}, { 'Retry-After': '30' }),
    });

    fireEvent.change(email(), { target: { value: 'anna@mail.lv' } });
    fireEvent.change(password(), { target: { value: 'correct horse' } });
    fireEvent.click(submit());

    expect(
      await screen.findByText(en.errors.retryIn.replace('{seconds}', '30'), {
        selector: '[aria-hidden="true"]',
      }),
    ).toBeVisible();
    expect(submit()).toBeDisabled();

    await act(() => vi.advanceTimersByTimeAsync(30_000));
    expect(submit()).toBeEnabled();
  });

  it('signs in and goes to a safe next page', async () => {
    const user = userEvent.setup();
    const calls = renderLogin(
      { 'POST /api/v1/auth/login': { status: 200, body: { user: testUser() } } },
      { next: '/settings' },
    );

    await user.type(email(), '  Anna@Mail.lv ');
    await user.type(password(), 'correct horse');
    await user.click(submit());

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/settings'));
    expect(calls.find((c) => c.path === '/api/v1/auth/login')?.body).toEqual({
      email: 'anna@mail.lv',
      password: 'correct horse',
    });
  });

  it('never follows a next that leaves the site (Review Focus 2)', async () => {
    const user = userEvent.setup();
    renderLogin(
      { 'POST /api/v1/auth/login': { status: 200, body: { user: testUser() } } },
      { next: '//evil.example' },
    );

    await user.type(email(), 'anna@mail.lv');
    await user.type(password(), 'correct horse');
    await user.click(submit());

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
  });

  it('sends a signed-in person straight on', async () => {
    renderLogin({}, { next: '/settings/security' }, true);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/settings/security'));
  });

  it('explains a failed Google sign-in', () => {
    renderLogin({}, { oauthError: 'OAUTH_CANCELLED' });
    expect(screen.getByRole('alert')).toHaveTextContent(en.errors.OAUTH_CANCELLED);
  });

  it('ignores an oauthError that is not a known code', () => {
    renderLogin({}, { oauthError: '<script>' });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('links to the password reset and to sign-up, keeping next', () => {
    renderLogin({}, { next: '/settings' });
    expect(screen.getByRole('link', { name: en.auth.login.forgot })).toHaveAttribute(
      'href',
      '/forgot-password',
    );
    expect(screen.getByRole('link', { name: en.auth.login.register })).toHaveAttribute(
      'href',
      '/register?next=%2Fsettings',
    );
  });
});

describe('Google on the sign-in page', () => {
  it('is hidden when this deployment has no Google sign-in', async () => {
    const calls = renderLogin(providers(false));
    await waitFor(() => expect(calls.some((c) => c.path === '/api/v1/auth/providers')).toBe(true));
    expect(screen.queryByRole('link', { name: en.auth.google })).toBeNull();
  });

  it('starts the Google sign-in with the safe next page, in this language', async () => {
    const { client } = fakeApi({ ...meRoute(null), ...providers(true) });
    renderWithSession(<LoginForm next="/settings" oauthError={null} />, {
      client,
      locale: 'lv',
      hasSession: false,
    });

    const link = await screen.findByRole('link', { name: 'Turpināt ar Google' });
    expect(link).toHaveAttribute('href', '/api/v1/auth/google?returnTo=%2Flv%2Fsettings');
  });
});
