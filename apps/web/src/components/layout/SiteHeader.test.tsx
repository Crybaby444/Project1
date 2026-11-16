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

const roots = [
  {
    slugs: { en: 'tools', lv: 'instrumenti', ru: 'instrumenty' },
    names: { en: 'Tools', lv: 'Instrumenti', ru: 'Инструменты' },
    sticker: 'blue',
    children: [{ slugs: { en: 'drills', lv: 'urbji', ru: 'dreli' }, names: { en: 'Drills', lv: 'Urbji', ru: 'Дрели' } }],
    more: 2,
  },
] as never;

const banner = () => screen.getByRole('banner');

describe('SiteHeader (the floating capsule and the phone tab bar)', () => {
  it('links the mark to the home page', async () => {
    const { client } = fakeApi(meRoute(null));
    renderWithSession(<SiteHeader />, { client });
    expect(within(banner()).getByRole('link', { name: en.nav.homeLabel })).toHaveAttribute('href', '/');
  });

  it('offers a visitor to sign in or sign up', async () => {
    const { client } = fakeApi(meRoute(null));
    renderWithSession(<SiteHeader />, { client });
    expect(await within(banner()).findByRole('link', { name: en.header.signIn })).toHaveAttribute('href', '/login');
    expect(within(banner()).getByRole('link', { name: en.header.signUp })).toHaveAttribute('href', '/register');
    expect(within(banner()).queryByRole('button', { name: new RegExp(`^${en.header.account}`) })).toBeNull();
  });

  it('shows a signed-in user their initials, lending and messages', async () => {
    const { client } = fakeApi(meRoute(testUser({ name: 'Anna Bērziņa' })));
    renderWithSession(<SiteHeader />, { client });
    const avatar = await within(banner()).findByRole('button', { name: new RegExp(`^${en.header.account}`) });
    expect(avatar).toHaveTextContent('AB');
    expect(within(banner()).getByRole('link', { name: en.header.lendItem })).toHaveAttribute('href', '/listings/new');
    expect(within(banner()).getByRole('link', { name: en.header.messages })).toHaveAttribute('href', '/messages');
  });

  it('keeps the language one compact menu', async () => {
    const { client } = fakeApi(meRoute(null));
    renderWithSession(<SiteHeader />, { client });
    const languages = within(banner()).getAllByRole('button', { name: new RegExp(`^${en.language.label}: English,\\s*en$`) });
    expect(languages.length).toBeGreaterThan(0);
    expect(languages[0]).toHaveAttribute('aria-haspopup', 'menu');
  });

  it('opens Catalog as a sheet of every category with its subcategories; What is Yoyo is a link', async () => {
    const user = userEvent.setup();
    const { client } = fakeApi(meRoute(null));
    renderWithSession(<SiteHeader catalog={roots} />, { client });
    const nav = within(banner()).getByRole('navigation', { name: en.nav.main });
    const catalog = within(nav).getByRole('button', { name: en.nav.catalog });
    expect(catalog).toHaveAttribute('aria-expanded', 'false');
    await user.click(catalog);
    expect(catalog).toHaveAttribute('aria-expanded', 'true');
    expect(within(nav).getByRole('link', { name: 'Tools' })).toHaveAttribute('href', '/c/tools');
    expect(within(nav).getByRole('link', { name: 'Drills' })).toHaveAttribute('href', '/c/drills');
    expect(within(nav).getByRole('link', { name: en.nav.whatIsYoyo })).toHaveAttribute('href', '/what-is-yoyo');
  });

  it('gives phones a tab bar: home, catalog, lend, messages, you', async () => {
    const { client } = fakeApi(meRoute(testUser()));
    const { container } = renderWithSession(<SiteHeader catalog={roots} />, { client });
    await within(banner()).findByRole('button', { name: new RegExp(`^${en.header.account}`) });
    const bar = container.querySelector('[data-tab-bar]') as HTMLElement;
    expect(within(bar).getByRole('link', { name: en.nav.home })).toHaveAttribute('href', '/');
    expect(within(bar).getByRole('button', { name: en.nav.catalog })).toBeInTheDocument();
    expect(within(bar).getByRole('link', { name: en.header.lendItem })).toHaveAttribute('href', '/listings/new');
    expect(within(bar).getByRole('link', { name: en.header.messages })).toHaveAttribute('href', '/messages');
    expect(within(bar).getByRole('link', { name: en.nav.you })).toHaveAttribute('href', '/u/user-1');
  });
});
