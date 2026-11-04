import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import en from '../../../messages/en.json';
import { fakeApi, meRoute, testUser } from '@/test/fake-api';
import { renderWithSession } from '@/test/render';
import { ThemeSelect } from './ThemeSelect';

function clearThemeCookie() {
  document.cookie = 'yoyo-theme=; path=/; max-age=0';
  delete document.documentElement.dataset['theme'];
}

describe('ThemeSelect', () => {
  afterEach(clearThemeCookie);

  it('offers system, light and dark as one radio group', async () => {
    const { client } = fakeApi(meRoute(null));
    renderWithSession(<ThemeSelect />, { client });

    const group = screen.getByRole('radiogroup', { name: en.theme.label });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: en.theme.system })).toBeChecked();
    expect(screen.getByRole('radio', { name: en.theme.light })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: en.theme.dark })).not.toBeChecked();
  });

  it('saves an explicit choice in the cookie and, when signed in, in the profile', async () => {
    const user = userEvent.setup();
    const { client, calls } = fakeApi({
      ...meRoute(testUser()),
      'PATCH /api/v1/me': (body) => ({ status: 200, body: { user: testUser(body as object) } }),
    });
    renderWithSession(<ThemeSelect />, { client });
    await waitFor(() => expect(calls.some((c) => c.path === '/api/v1/me')).toBe(true));

    await user.click(screen.getByRole('radio', { name: en.theme.dark }));

    expect(document.cookie).toContain('yoyo-theme=dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');
    await waitFor(() =>
      expect(calls.find((c) => c.method === 'PATCH')).toMatchObject({
        path: '/api/v1/me',
        body: { theme: 'dark' },
      }),
    );
  });

  it('does not touch the profile for a visitor', async () => {
    const user = userEvent.setup();
    const { client, calls } = fakeApi(meRoute(null));
    renderWithSession(<ThemeSelect />, { client });

    await user.click(screen.getByRole('radio', { name: en.theme.light }));

    expect(document.cookie).toContain('yoyo-theme=light');
    expect(calls.some((c) => c.method === 'PATCH')).toBe(false);
  });

  it('"System" removes the explicit choice and follows the OS again', async () => {
    const user = userEvent.setup();
    const { client } = fakeApi(meRoute(null));
    renderWithSession(<ThemeSelect />, { client });
    await user.click(screen.getByRole('radio', { name: en.theme.dark }));
    expect(document.cookie).toContain('yoyo-theme=dark');

    await user.click(screen.getByRole('radio', { name: en.theme.system }));

    expect(document.cookie).not.toContain('yoyo-theme');
    expect(document.documentElement.dataset['theme']).toBe('light'); // the OS (matchMedia stub) is light
    expect(screen.getByRole('radio', { name: en.theme.system })).toBeChecked();
  });
});
