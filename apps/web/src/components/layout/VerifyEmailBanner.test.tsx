import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import en from '../../../messages/en.json';
import { apiError, fakeApi, meRoute, testUser, type FakeRoutes } from '@/test/fake-api';
import { renderWithSession } from '@/test/render';
import { VerifyEmailBanner } from './VerifyEmailBanner';

function renderBanner(routes: FakeRoutes) {
  const { client, calls } = fakeApi(routes);
  renderWithSession(<VerifyEmailBanner />, { client });
  return calls;
}

/** Lets the fake API and React Query settle while timers are fake. */
async function settle() {
  for (let i = 0; i < 5; i++) await act(() => vi.advanceTimersByTimeAsync(10));
}

describe('VerifyEmailBanner', () => {
  afterEach(() => vi.useRealTimers());

  it('is not there for a confirmed email or a visitor', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderBanner(meRoute(testUser({ emailVerified: true })));
    await settle();
    expect(screen.queryByText(en.banner.verifyEmail.title)).toBeNull();
  });

  it('asks to confirm the email and sends the email again', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const calls = renderBanner({
      ...meRoute(testUser({ emailVerified: false })),
      'POST /api/v1/auth/resend-verification': { status: 202 },
    });
    await settle();

    expect(screen.getByText(en.banner.verifyEmail.title)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: en.banner.verifyEmail.resend }));
    await settle();

    expect(calls.filter((c) => c.path === '/api/v1/auth/resend-verification')).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveTextContent(en.banner.verifyEmail.sent);
  });

  it('after a 429 keeps the button off for the Retry-After seconds, counting down', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderBanner({
      ...meRoute(testUser({ emailVerified: false })),
      'POST /api/v1/auth/resend-verification': apiError(429, 'RATE_LIMITED', {}, { 'Retry-After': '30' }),
    });
    await settle();

    fireEvent.click(screen.getByRole('button', { name: en.banner.verifyEmail.resend }));
    await settle();

    const button = screen.getByRole('button', { name: en.banner.verifyEmail.resend });
    expect(button).toBeDisabled();
    expect(
      screen.getByText(en.errors.retryIn.replace('{seconds}', '30'), { selector: '[aria-hidden="true"]' }),
    ).toBeVisible();

    await act(() => vi.advanceTimersByTimeAsync(10_000));
    expect(
      screen.getByText(en.errors.retryIn.replace('{seconds}', '20'), { selector: '[aria-hidden="true"]' }),
    ).toBeVisible();

    await act(() => vi.advanceTimersByTimeAsync(20_000));
    expect(button).toBeEnabled();
  });
});
