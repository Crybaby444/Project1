import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import en from '../../../messages/en.json';
import { apiError, fakeApi, meRoute, type FakeRoutes } from '@/test/fake-api';
import { renderWithSession } from '@/test/render';
import { ForgotPasswordForm } from './ForgotPasswordForm';

vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/navigation')>()),
  usePathname: () => '/forgot-password',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

async function ask(routes: FakeRoutes, email: string) {
  const user = userEvent.setup();
  const { client, calls } = fakeApi({ ...meRoute(null), ...routes });
  const view = renderWithSession(<ForgotPasswordForm />, { client, hasSession: false });
  await user.type(screen.getByLabelText(en.auth.fields.email), email);
  await user.click(screen.getByRole('button', { name: en.auth.forgot.submit }));
  return { calls, view };
}

describe('ForgotPasswordForm', () => {
  it('shows the same screen whether or not the account exists (Review Focus 3)', async () => {
    const known = await ask({ 'POST /api/v1/auth/forgot-password': { status: 202 } }, 'anna@mail.lv');
    await screen.findByRole('heading', { name: en.auth.forgot.sent.title });
    const knownText = known.view.container.textContent;
    known.view.unmount();

    // The API answers 202 for an unknown email too; the screen must not differ in any way.
    const unknown = await ask({ 'POST /api/v1/auth/forgot-password': { status: 202 } }, 'anna@mail.lv');
    await screen.findByRole('heading', { name: en.auth.forgot.sent.title });
    expect(unknown.view.container.textContent).toBe(knownText);
    expect(unknown.calls.find((c) => c.path === '/api/v1/auth/forgot-password')?.body).toEqual({
      email: 'anna@mail.lv',
    });
  });

  it('counts a 429 down instead', async () => {
    await ask(
      { 'POST /api/v1/auth/forgot-password': apiError(429, 'RATE_LIMITED', {}, { 'Retry-After': '120' }) },
      'anna@mail.lv',
    );
    expect(
      await screen.findByText(en.errors.retryIn.replace('{seconds}', '120'), {
        selector: '[aria-hidden="true"]',
      }),
    ).toBeVisible();
    expect(screen.queryByRole('heading', { name: en.auth.forgot.sent.title })).toBeNull();
    expect(screen.getByRole('button', { name: en.auth.forgot.submit })).toBeDisabled();
  });

  it('does not claim a link was sent when the API could not be reached', async () => {
    await ask({ 'POST /api/v1/auth/forgot-password': apiError(500, 'INTERNAL') }, 'anna@mail.lv');
    expect(await screen.findByText(en.errors.INTERNAL)).toBeVisible();
    expect(screen.queryByRole('heading', { name: en.auth.forgot.sent.title })).toBeNull();
  });

  it('moves the focus to the "check your email" heading, so a screen reader hears it', async () => {
    await ask({ 'POST /api/v1/auth/forgot-password': { status: 202 } }, 'anna@mail.lv');
    const heading = await screen.findByRole('heading', { name: en.auth.forgot.sent.title });
    await waitFor(() => expect(heading).toHaveFocus());
  });
});
