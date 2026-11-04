import { act, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeApi, meRoute, testUser } from '@/test/fake-api';
import { renderWithSession } from '@/test/render';
import { RequireSession } from './RequireSession';
import { useSession } from './SessionProvider';

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

  it('goes home, not to /login, when the person ended the session on purpose', async () => {
    const { client } = fakeApi(meRoute(testUser()));
    let forget: () => void = () => {};
    function Leave() {
      forget = useSession().forget;
      return null;
    }
    renderWithSession(
      <>
        <Leave />
        <RequireSession>
          <p>secret</p>
        </RequireSession>
      </>,
      { client },
    );
    await screen.findByText('secret');

    act(() => forget());

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
    expect(replace).not.toHaveBeenCalledWith(expect.stringContaining('/login'));
  });

  it('sends a visitor to /login again once the sign-out is a while ago', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, now: new Date('2026-11-04T12:00:00Z') });
    const { client } = fakeApi(meRoute(testUser()));
    let forget: () => void = () => {};
    let show: (visible: boolean) => void = () => {};
    function Leave() {
      forget = useSession().forget;
      return null;
    }
    function Page() {
      const [visible, setVisible] = useState(true);
      show = setVisible;
      return visible ? (
        <RequireSession>
          <p>secret</p>
        </RequireSession>
      ) : null;
    }
    renderWithSession(
      <>
        <Leave />
        <Page />
      </>,
      { client },
    );
    await screen.findByText('secret');
    act(() => {
      forget();
      show(false); // the person left the page
    });
    vi.setSystemTime(new Date('2026-11-04T12:05:00Z'));
    replace.mockClear();

    act(() => show(true)); // later they open a protected page again

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login?next=%2Fsettings'));
    vi.useRealTimers();
  });
});
