import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { fakeApi, meRoute } from '@/test/fake-api';
import { renderWithSession } from '@/test/render';
import { GoogleButton } from './GoogleButton';

function show(providers: { google: boolean; apple: boolean }) {
  const { client } = fakeApi({ ...meRoute(null), 'GET /api/v1/auth/providers': { status: 200, body: { ...providers, phone: false } } });
  renderWithSession(<GoogleButton next="/items" />, { client, hasSession: false });
}

describe('social sign-in buttons', () => {
  it('offers Apple and Google when both are configured, each back to the same page', async () => {
    show({ google: true, apple: true });
    expect(await screen.findByRole('link', { name: 'Continue with Apple' })).toHaveAttribute('href', '/api/v1/auth/apple?returnTo=%2Fitems');
    expect(screen.getByRole('link', { name: 'Continue with Google' })).toHaveAttribute('href', '/api/v1/auth/google?returnTo=%2Fitems');
  });

  it('shows only what is configured, and nothing at all when neither is', async () => {
    show({ google: false, apple: true });
    expect(await screen.findByRole('link', { name: 'Continue with Apple' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Continue with Google' })).toBeNull();
  });
});
