import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import en from '../../../messages/en.json';
import { fakeApi, meRoute, testUser } from '@/test/fake-api';
import { renderWithSession } from '@/test/render';
import { SiteHeader } from './SiteHeader';

vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/navigation')>()),
  usePathname: () => '/',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

describe('SiteHeader', () => {
  it('links the wordmark to the home page', async () => {
    const { client } = fakeApi(meRoute(null));
    renderWithSession(<SiteHeader />, { client });
    expect(screen.getByRole('link', { name: 'Yoyo' })).toHaveAttribute('href', '/');
  });

  it('offers a visitor to sign in or sign up', async () => {
    const { client } = fakeApi(meRoute(null));
    renderWithSession(<SiteHeader />, { client });

    expect(await screen.findByRole('link', { name: en.header.signIn })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: en.header.signUp })).toHaveAttribute('href', '/register');
    expect(screen.queryByRole('button', { name: new RegExp(`^${en.header.account}`) })).toBeNull();
  });

  it('shows a signed-in user their initials instead', async () => {
    const { client } = fakeApi(meRoute(testUser({ name: 'Anna Bērziņa' })));
    renderWithSession(<SiteHeader />, { client });

    const avatar = await screen.findByRole('button', { name: new RegExp(`^${en.header.account}`) });
    expect(avatar).toHaveTextContent('AB');
    expect(screen.queryByRole('link', { name: en.header.signIn })).toBeNull();
  });

  it('keeps the language and theme controls for everyone', async () => {
    const { client } = fakeApi(meRoute(null));
    renderWithSession(<SiteHeader />, { client });

    expect(screen.getByRole('button', { name: en.theme.toggle })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Latviešu' }).length).toBeGreaterThan(0);
    expect(
      screen.getByRole('button', { name: new RegExp(`^${en.language.label}: English,\\s*en$`) }),
    ).toBeInTheDocument();
  });
});
