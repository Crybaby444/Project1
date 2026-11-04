import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import en from '../../../messages/en.json';
import { apiError, fakeApi, meRoute, testUser, type FakeRoutes } from '@/test/fake-api';
import { renderWithSession } from '@/test/render';
import { VerifyEmailView } from './VerifyEmailView';

vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/navigation')>()),
  usePathname: () => '/verify-email',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

function renderView(
  token: string | null,
  routes: FakeRoutes,
  signedIn: ReturnType<typeof testUser> | null = null,
) {
  const { client, calls } = fakeApi({ ...meRoute(signedIn), ...routes });
  renderWithSession(<VerifyEmailView token={token} />, { client, hasSession: signedIn !== null });
  return calls;
}

const verifyCalls = (calls: { path: string }[]) =>
  calls.filter((c) => c.path === '/api/v1/auth/verify-email');

describe('VerifyEmailView', () => {
  it('checks the link once, then says the email is confirmed', async () => {
    const calls = renderView('tok-1', {
      'POST /api/v1/auth/verify-email': { status: 200, body: { user: testUser({ emailVerified: true }) } },
    });

    expect(screen.getByText(en.auth.verify.checking).closest('[role="status"]')).toHaveAttribute(
      'aria-busy',
      'true',
    );
    expect(await screen.findByRole('heading', { name: en.auth.verify.done.title })).toBeVisible();
    expect(screen.getByRole('link', { name: en.auth.verify.continue })).toHaveAttribute('href', '/');
    expect(verifyCalls(calls)).toHaveLength(1);
    expect(verifyCalls(calls)[0]).toMatchObject({ body: { token: 'tok-1' } });
  });

  it('updates the signed-in session, so the banner goes away', async () => {
    let verified = false;
    const calls = renderView(
      'tok-2',
      {
        'GET /api/v1/me': () => ({ status: 200, body: { user: testUser({ emailVerified: verified }) } }),
        'POST /api/v1/auth/verify-email': () => {
          verified = true;
          return { status: 200, body: { user: testUser({ emailVerified: true }) } };
        },
      },
      testUser({ emailVerified: false }),
    );

    await screen.findByRole('heading', { name: en.auth.verify.done.title });
    await waitFor(() =>
      expect(calls.filter((c) => c.path === '/api/v1/me').length).toBeGreaterThanOrEqual(2),
    );
  });

  it('explains a link used before and offers a new email to a signed-in person (Review Focus 5)', async () => {
    const user = userEvent.setup();
    const calls = renderView(
      'tok-3',
      {
        'POST /api/v1/auth/verify-email': apiError(410, 'TOKEN_USED'),
        'POST /api/v1/auth/resend-verification': { status: 202 },
      },
      testUser({ emailVerified: false }),
    );

    expect(await screen.findByRole('heading', { name: en.auth.verify.used.title })).toBeVisible();
    await user.click(screen.getByRole('button', { name: en.auth.verify.resend }));

    await waitFor(() => expect(calls.some((c) => c.path === '/api/v1/auth/resend-verification')).toBe(true));
    expect(await screen.findByText(en.banner.verifyEmail.sent)).toBeVisible();
  });

  it('explains an expired link and offers a visitor to sign in', async () => {
    renderView('tok-4', { 'POST /api/v1/auth/verify-email': apiError(410, 'TOKEN_EXPIRED') });

    expect(await screen.findByRole('heading', { name: en.auth.verify.expired.title })).toBeVisible();
    expect(screen.getByRole('link', { name: en.auth.verify.signIn })).toHaveAttribute('href', '/login');
    expect(screen.queryByRole('button', { name: en.auth.verify.resend })).toBeNull();
  });

  it('treats a missing token like a broken link, without asking the API', async () => {
    const calls = renderView(null, {});
    expect(await screen.findByRole('heading', { name: en.auth.verify.invalid.title })).toBeVisible();
    expect(verifyCalls(calls)).toHaveLength(0);
  });

  it('treats a token the API does not know like a broken link', async () => {
    renderView('nope', {
      'POST /api/v1/auth/verify-email': apiError(400, 'VALIDATION_FAILED', {
        fields: { token: 'This link is not valid' },
      }),
    });
    expect(await screen.findByRole('heading', { name: en.auth.verify.invalid.title })).toBeVisible();
  });

  it('offers to try again when the API cannot be reached', async () => {
    renderView('tok-5', { 'POST /api/v1/auth/verify-email': apiError(500, 'INTERNAL') });
    expect(await screen.findByText(en.errors.INTERNAL)).toBeVisible();
    expect(screen.getByRole('button', { name: en.auth.verify.retry })).toBeVisible();
  });
});
