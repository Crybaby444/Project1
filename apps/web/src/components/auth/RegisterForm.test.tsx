import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import en from '../../../messages/en.json';
import lv from '../../../messages/lv.json';
import { apiError, fakeApi, meRoute, testUser, type FakeRoutes } from '@/test/fake-api';
import { renderWithSession } from '@/test/render';
import { passwordStrength, RegisterForm } from './RegisterForm';

const replace = vi.fn();
vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/navigation')>()),
  usePathname: () => '/register',
  useRouter: () => ({ replace, push: vi.fn(), refresh: vi.fn() }),
}));

function renderRegister(
  routes: FakeRoutes,
  locale: 'en' | 'lv' = 'en',
  next: string | null = null,
  theme: 'system' | 'light' | 'dark' = 'system',
) {
  const { client, calls } = fakeApi({
    ...meRoute(null),
    'GET /api/v1/auth/providers': { status: 200, body: { google: false, phone: false } },
    ...routes,
  });
  renderWithSession(<RegisterForm next={next} />, { client, locale, hasSession: false, theme });
  return calls;
}

describe('RegisterForm', () => {
  beforeEach(() => replace.mockClear());

  it('creates the account in the page language and goes on to next', async () => {
    const user = userEvent.setup();
    const calls = renderRegister(
      { 'POST /api/v1/auth/register': { status: 201, body: { user: testUser({ emailVerified: false }) } } },
      'lv',
      '/settings',
    );

    await user.type(screen.getByLabelText(lv.auth.fields.name), 'Anna');
    await user.type(screen.getByLabelText(lv.auth.fields.email), 'anna@mail.lv');
    await user.type(screen.getByLabelText(lv.auth.fields.password), 'correct horse battery');
    await user.click(screen.getByRole('button', { name: lv.auth.register.submit }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/settings'));
    expect(calls.find((c) => c.path === '/api/v1/auth/register')?.body).toEqual({
      name: 'Anna',
      email: 'anna@mail.lv',
      password: 'correct horse battery',
      locale: 'lv',
    });
  });

  it('checks the password length before sending anything', async () => {
    const user = userEvent.setup();
    const calls = renderRegister({});

    await user.type(screen.getByLabelText(en.auth.fields.name), 'Anna');
    await user.type(screen.getByLabelText(en.auth.fields.email), 'anna@mail.lv');
    await user.type(screen.getByLabelText(en.auth.fields.password), 'short');
    await user.click(screen.getByRole('button', { name: en.auth.register.submit }));

    const field = screen.getByLabelText(en.auth.fields.password);
    await waitFor(() => expect(field).toHaveFocus());
    expect(field).toHaveAccessibleDescription(expect.stringContaining('At least 8 characters'));
    expect(calls.some((c) => c.path === '/api/v1/auth/register')).toBe(false);
  });

  it('puts the server’s field errors on the fields and focuses the first one', async () => {
    const user = userEvent.setup();
    renderRegister({
      'POST /api/v1/auth/register': apiError(400, 'VALIDATION_FAILED', {
        fields: { email: 'Invalid email address' },
      }),
    });

    await user.type(screen.getByLabelText(en.auth.fields.name), 'Anna');
    await user.type(screen.getByLabelText(en.auth.fields.email), 'anna@mail.lv');
    await user.type(screen.getByLabelText(en.auth.fields.password), 'correct horse battery');
    await user.click(screen.getByRole('button', { name: en.auth.register.submit }));

    const field = screen.getByLabelText(en.auth.fields.email);
    await waitFor(() => expect(field).toHaveAttribute('aria-invalid', 'true'));
    expect(field).toHaveAccessibleDescription(expect.stringContaining(en.errors.fieldInvalid));
    expect(field).toHaveFocus();
  });

  it('says when the email already has an account', async () => {
    const user = userEvent.setup();
    renderRegister({ 'POST /api/v1/auth/register': apiError(409, 'AUTH_EMAIL_TAKEN') });

    await user.type(screen.getByLabelText(en.auth.fields.name), 'Anna');
    await user.type(screen.getByLabelText(en.auth.fields.email), 'anna@mail.lv');
    await user.type(screen.getByLabelText(en.auth.fields.password), 'correct horse battery');
    await user.click(screen.getByRole('button', { name: en.auth.register.submit }));

    expect(await screen.findByRole('alert')).toHaveTextContent(en.errors.AUTH_EMAIL_TAKEN);
  });

  it('rates the password as the person types', async () => {
    const user = userEvent.setup();
    renderRegister({});
    const field = screen.getByLabelText(en.auth.fields.password);

    await user.type(field, 'abcdefgh');
    expect(screen.getByText(`${en.auth.strength.label}: ${en.auth.strength.weak}`)).toBeInTheDocument();
    await user.clear(field);
    await user.type(field, 'Correct-Horse-9');
    expect(screen.getByText(`${en.auth.strength.label}: ${en.auth.strength.strong}`)).toBeInTheDocument();
  });

  it('keeps the theme the visitor chose before signing up, in the new profile too', async () => {
    const user = userEvent.setup();
    const calls = renderRegister(
      {
        'POST /api/v1/auth/register': { status: 201, body: { user: testUser({ theme: 'system' }) } },
        'PATCH /api/v1/me': { status: 200, body: { user: testUser({ theme: 'dark' }) } },
      },
      'en',
      null,
      'dark',
    );

    await user.type(screen.getByLabelText(en.auth.fields.name), 'Anna');
    await user.type(screen.getByLabelText(en.auth.fields.email), 'anna@mail.lv');
    await user.type(screen.getByLabelText(en.auth.fields.password), 'correct horse battery');
    await user.click(screen.getByRole('button', { name: en.auth.register.submit }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
    expect(calls.find((c) => c.method === 'PATCH' && c.path === '/api/v1/me')?.body).toEqual({
      theme: 'dark',
    });
  });

  it('does not touch the profile theme when the visitor follows the system', async () => {
    const user = userEvent.setup();
    const calls = renderRegister({
      'POST /api/v1/auth/register': { status: 201, body: { user: testUser() } },
    });
    await user.type(screen.getByLabelText(en.auth.fields.name), 'Anna');
    await user.type(screen.getByLabelText(en.auth.fields.email), 'anna@mail.lv');
    await user.type(screen.getByLabelText(en.auth.fields.password), 'correct horse battery');
    await user.click(screen.getByRole('button', { name: en.auth.register.submit }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
    expect(calls.some((c) => c.method === 'PATCH')).toBe(false);
  });
});

describe('passwordStrength', () => {
  it('has three levels by length and variety, and none for an empty password', () => {
    expect(passwordStrength('')).toBe(0);
    expect(passwordStrength('short')).toBe(1);
    expect(passwordStrength('abcdefghij')).toBe(1); // long enough, one kind of character
    expect(passwordStrength('abcdefgh12')).toBe(2);
    expect(passwordStrength('correct horse')).toBe(2);
    expect(passwordStrength('Correct-Horse-9')).toBe(3);
    expect(passwordStrength('correct horse battery staple')).toBe(3); // long passphrases are strong
  });
});
