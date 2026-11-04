import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeApi, meRoute, testUser } from '@/test/fake-api';
import { renderWithSession } from '@/test/render';
import { RequireSession } from './RequireSession';

const replace = vi.fn();
vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => '/settings',
}));

describe('RequireSession', () => {
  beforeEach(() => replace.mockClear());

  it('shows a busy skeleton while the session loads', () => {
    const { client } = fakeApi({ 'GET /api/v1/me': () => new Promise(() => {}) });
    renderWithSession(
      <RequireSession>
        <p>secret</p>
      </RequireSession>,
      { client },
    );

    expect(screen.getByTestId('session-skeleton')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText('secret')).toBeNull();
  });

  it('sends a signed-out visitor to /login with the page to come back to', async () => {
    const { client } = fakeApi(meRoute(null));
    renderWithSession(
      <RequireSession>
        <p>secret</p>
      </RequireSession>,
      { client },
    );

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login?next=%2Fsettings'));
    expect(screen.queryByText('secret')).toBeNull();
  });

  it('shows the page to a signed-in user', async () => {
    const { client } = fakeApi(meRoute(testUser()));
    renderWithSession(
      <RequireSession>
        <p>secret</p>
      </RequireSession>,
      { client },
    );

    expect(await screen.findByText('secret')).toBeVisible();
    expect(replace).not.toHaveBeenCalled();
  });
});
