import { act, screen, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { describe, expect, it } from 'vitest';
import { fakeApi, meRoute, testUser } from '@/test/fake-api';
import { renderWithSession } from '@/test/render';
import { hasSessionHint, useSession } from './SessionProvider';

const latest: { session?: ReturnType<typeof useSession> } = {};

function Probe() {
  const current = useSession();
  useEffect(() => {
    latest.session = current;
  });
  return (
    <p data-testid="status">
      {current.status === 'authenticated' ? `in:${current.user?.name}` : current.status}
    </p>
  );
}

const session = new Proxy({} as ReturnType<typeof useSession>, {
  get: (_t, key) => latest.session![key as keyof ReturnType<typeof useSession>],
});

describe('SessionProvider', () => {
  it('is loading first, then authenticated with the user from GET /me', async () => {
    const { client } = fakeApi(meRoute(testUser()));
    renderWithSession(<Probe />, { client });

    expect(screen.getByTestId('status')).toHaveTextContent('loading');
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('in:Anna Bērziņa'));
  });

  it('is anonymous when GET /me answers 401', async () => {
    const { client } = fakeApi(meRoute(null));
    renderWithSession(<Probe />, { client });

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('anonymous'));
    expect(session.user).toBeNull();
  });

  it('does not ask the API at all when this browser has no session hint (a visitor)', async () => {
    const { client, calls } = fakeApi(meRoute(testUser()));
    renderWithSession(<Probe />, { client, hasSession: false });

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('anonymous'));
    expect(calls).toHaveLength(0);
  });

  it('reads the hint from the yoyo_session cookie', () => {
    expect(hasSessionHint('a=1; yoyo_session=1; b=2')).toBe(true);
    expect(hasSessionHint('a=1; yoyo_sessionx=1')).toBe(false);
    expect(hasSessionHint('')).toBe(false);
  });

  it('signs out through POST /auth/logout and becomes anonymous', async () => {
    const { client, calls } = fakeApi({
      ...meRoute(testUser()),
      'POST /api/v1/auth/logout': { status: 204 },
    });
    renderWithSession(<Probe />, { client });
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('in:'));

    await act(() => session.signOut());

    expect(calls.some((c) => c.method === 'POST' && c.path === '/api/v1/auth/logout')).toBe(true);
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('anonymous'));
  });

  it('refresh() asks GET /me again', async () => {
    let name = 'Anna';
    const { client } = fakeApi({
      'GET /api/v1/me': () => ({ status: 200, body: { user: testUser({ name }) } }),
    });
    renderWithSession(<Probe />, { client });
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('in:Anna'));

    name = 'Anna B.';
    await act(() => session.refresh());

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('in:Anna B.'));
  });

  it('setUser() shows a user the API just returned without asking again', async () => {
    const { client } = fakeApi(meRoute(null));
    renderWithSession(<Probe />, { client });
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('anonymous'));

    act(() => session.setUser(testUser({ name: 'Jānis' })));

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('in:Jānis'));
  });
});

describe('SessionProvider refresh during the first request', () => {
  it('asks again instead of reusing an answer that may predate the change', async () => {
    let answer: (() => void) | undefined;
    let verified = false;
    const { client, calls } = fakeApi({
      'GET /api/v1/me': () =>
        new Promise((resolve) => {
          const snapshot = verified;
          answer = () => resolve({ status: 200, body: { user: testUser({ emailVerified: snapshot }) } });
          if (verified) answer();
        }),
    });
    renderWithSession(<Probe />, { client });
    await waitFor(() => expect(calls).toHaveLength(1)); // the first GET /me is on its way

    verified = true;
    const refreshing = session.refresh();
    answer!(); // the old answer arrives late
    await act(() => refreshing);

    expect(calls).toHaveLength(2);
    await waitFor(() => expect(latest.session?.user?.emailVerified).toBe(true));
  });
});
