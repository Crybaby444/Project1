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
    expect(screen.queryByRole('link', { name: en.header.lendItem })).toBeNull();
    expect(screen.queryByRole('button', { name: new RegExp(`^${en.header.account}`) })).toBeNull();
  });

  it('shows a signed-in user their initials instead', async () => {
    const { client } = fakeApi(meRoute(testUser({ name: 'Anna Bērziņa' })));
    renderWithSession(<SiteHeader />, { client });

    const avatar = await screen.findByRole('button', { name: new RegExp(`^${en.header.account}`) });
    expect(avatar).toHaveTextContent('AB');
    expect(screen.queryByRole('link', { name: en.header.signIn })).toBeNull();
    expect(screen.getByRole('link', { name: en.header.lendItem })).toHaveAttribute('href', '/listings/new');
  });

  it('keeps the language and theme controls for everyone', async () => {
    const { client } = fakeApi(meRoute(null));
    renderWithSession(<SiteHeader />, { client });

    expect(screen.getByRole('button', { name: en.theme.toggle })).toBeInTheDocument();
    // One compact language pill at every width (no wide segmented control).
    const languages = screen.getAllByRole('button', {
      name: new RegExp(`^${en.language.label}: English,\\s*en$`),
    });
    expect(languages).toHaveLength(1);
    expect(languages[0]).toHaveAttribute('aria-haspopup', 'menu');
    expect(screen.queryByRole('navigation', { name: en.language.label })).toBeNull();
  });

  it('has no catalog in the header: the catalog lives on the home page and in the footer (owner, 2026-11-13)', async () => {
    const { client } = fakeApi(meRoute(null));
    renderWithSession(<SiteHeader catalog={[{ id: 'c1', slug: 'tools', name: 'Tools', children: [] } as never]} />, { client });
    expect(screen.queryByRole('button', { name: new RegExp(en.header.catalog.button) })).toBeNull();
  });

  it('keeps the mark dead centre, whatever is beside it', async () => {
    const { client } = fakeApi(meRoute(null));
    renderWithSession(<SiteHeader />, { client });
    const brand = screen.getByRole('link', { name: 'Yoyo' });
    expect(brand).toHaveAttribute('data-site-brand');
    expect(brand.className).toMatch(/\babsolute\b/);
    expect(brand.className).toMatch(/left-1\/2/);
    expect(brand.className).toMatch(/-translate-x-1\/2/);
  });

  it('on a phone keeps the language in the header (in the empty left corner) and lets the theme step aside', async () => {
    const { client } = fakeApi(meRoute(null));
    renderWithSession(<SiteHeader />, { client });
    const language = screen.getByRole('button', { name: new RegExp(`^${en.language.label}`) });
    const theme = screen.getByRole('button', { name: en.theme.toggle });
    expect(language.closest('[data-desktop-only]')).toBeNull();
    expect(language.closest('[data-phone-left]')).not.toBeNull();
    expect(theme.closest('[data-desktop-only]')).not.toBeNull();
  });
});
