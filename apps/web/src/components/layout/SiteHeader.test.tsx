import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('shows every category with its subcategories in the navigation row (owner, 2026-11-16)', async () => {
    const user = userEvent.setup();
    const { client } = fakeApi(meRoute(null));
    const roots = [
      {
        slugs: { en: 'tools', lv: 'instrumenti', ru: 'instrumenty' },
        names: { en: 'Tools', lv: 'Instrumenti', ru: 'Инструменты' },
        sticker: 'blue',
        children: [{ slugs: { en: 'drills', lv: 'urbji', ru: 'dreli' }, names: { en: 'Drills', lv: 'Urbji', ru: 'Дрели' } }],
        more: 2,
      },
    ] as never;
    renderWithSession(<SiteHeader catalog={roots} />, { client });
    const nav = screen.getByRole('navigation', { name: en.nav.categories });
    const tools = within(nav).getByRole('button', { name: 'Tools' });
    expect(tools).toHaveAttribute('aria-expanded', 'false');
    await user.click(tools);
    expect(tools).toHaveAttribute('aria-expanded', 'true');
    expect(within(nav).getAllByRole('link', { name: 'Drills' })[0]).toHaveAttribute('href', '/c/drills');
    await user.click(within(nav).getByRole('button', { name: en.nav.allCategories }));
    expect(within(nav).getByRole('link', { name: 'Tools' })).toHaveAttribute('href', '/c/tools');
    expect(within(nav).getByRole('link', { name: en.nav.whatIsYoyo })).toHaveAttribute('href', '/what-is-yoyo');
  });

  it('puts the mark first, on the left', async () => {
    const { client } = fakeApi(meRoute(null));
    const { container } = renderWithSession(<SiteHeader />, { client });
    const brand = screen.getByRole('link', { name: 'Yoyo' });
    expect(brand).toHaveAttribute('data-site-brand');
    const outside = [...container.querySelectorAll('header a')].filter((a) => !a.closest('dialog'));
    expect(outside[0]).toBe(brand);
  });

  it('keeps the language in the row and the theme on wide screens (the phone menu has it too)', async () => {
    const { client } = fakeApi(meRoute(null));
    renderWithSession(<SiteHeader />, { client });
    const language = screen.getByRole('button', { name: new RegExp(`^${en.language.label}`) });
    expect(language.closest('[data-desktop-only]')).toBeNull();
    const themes = screen.getAllByRole('button', { name: en.theme.toggle, hidden: true });
    expect(themes.some((b) => b.closest('[data-desktop-only]') !== null)).toBe(true);
  });
});
