import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { STICKER_COLORS } from '@yoyo/shared';
import { describe, expect, it, vi } from 'vitest';
import en from '../../../messages/en.json';
import deals from '../../../messages/deals/en.json';
import { fakeApi, meRoute, testUser } from '@/test/fake-api';
import { renderWithSession } from '@/test/render';
import { avatarColor, initials, UserMenu } from './UserMenu';

const push = vi.fn();
vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/navigation')>()),
  usePathname: () => '/settings',
  useRouter: () => ({ replace: vi.fn(), push, refresh: vi.fn() }),
}));

async function renderMenu(person = testUser()) {
  const { client, calls } = fakeApi({ ...meRoute(person), 'POST /api/v1/auth/logout': { status: 204 } });
  renderWithSession(<UserMenu user={person} />, { client });
  return { calls, button: screen.getByRole('button', { name: new RegExp(`^${en.header.account}`) }) };
}

describe('UserMenu', () => {
  it('opens with Enter on the first item and closes with Esc, back on the button', async () => {
    const user = userEvent.setup();
    const { button } = await renderMenu();
    expect(button).toHaveAttribute('aria-haspopup', 'menu');
    expect(button).toHaveAttribute('aria-expanded', 'false');

    button.focus();
    await user.keyboard('{Enter}');

    const menu = screen.getByRole('menu');
    expect(button).toHaveAttribute('aria-expanded', 'true');
    const items = within(menu).getAllByRole('menuitem');
    expect(items.map((i) => i.textContent)).toEqual([
      deals.dealsMenu.myDeals,
      deals.dealsMenu.wallet,
      en.header.myListings,
      en.header.settings,
      en.header.signOut,
    ]);
    expect(items[0]).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(items[1]).toHaveFocus();
    await user.keyboard('{End}');
    expect(items[4]).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(items[0]).toHaveFocus(); // wraps around

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveFocus();
  });

  it('shows who is signed in', async () => {
    const user = userEvent.setup();
    const { button } = await renderMenu();
    await user.click(button);
    expect(screen.getByText('Anna Bērziņa')).toBeVisible();
    expect(screen.getByText('anna@mail.lv')).toBeVisible();
  });

  it('links to the settings', async () => {
    const user = userEvent.setup();
    const { button } = await renderMenu();
    await user.click(button);
    expect(screen.getByRole('menuitem', { name: en.header.settings })).toHaveAttribute('href', '/settings');
  });

  it('links to my listings, and to moderation for an administrator only', async () => {
    const user = userEvent.setup();
    const { button } = await renderMenu();
    await user.click(button);
    expect(screen.getByRole('menuitem', { name: en.header.myListings })).toHaveAttribute(
      'href',
      '/dashboard/lending',
    );
    expect(screen.queryByRole('menuitem', { name: en.header.moderation })).toBeNull();
  });

  it('offers moderation to an administrator', async () => {
    const user = userEvent.setup();
    const { button } = await renderMenu(testUser({ role: 'ADMIN' }));
    await user.click(button);
    expect(screen.getByRole('menuitem', { name: en.header.moderation })).toHaveAttribute(
      'href',
      '/admin/listings',
    );
  });

  it('signs out', async () => {
    const user = userEvent.setup();
    const { button, calls } = await renderMenu();
    await user.click(button);
    await user.click(screen.getByRole('menuitem', { name: en.header.signOut }));

    await waitFor(() => expect(calls.some((c) => c.path === '/api/v1/auth/logout')).toBe(true));
    expect(push).toHaveBeenCalledWith('/');
  });

  it('closes when the pointer goes elsewhere', async () => {
    const user = userEvent.setup();
    const { button } = await renderMenu();
    await user.click(button);
    await user.click(document.body);
    expect(screen.queryByRole('menu')).toBeNull();
  });
});

describe('avatar', () => {
  it('uses the first letters of the first two names', () => {
    expect(initials('Anna Bērziņa')).toBe('AB');
    expect(initials('  jānis  ')).toBe('J');
    expect(initials('Мария Анна Петрова')).toBe('МА');
  });

  it('always gives the same user the same sticker colour', () => {
    const colours = Object.values(STICKER_COLORS);
    expect(avatarColor('user-1')).toBe(avatarColor('user-1'));
    expect(colours).toContain(avatarColor('user-1'));
    const spread = new Set(Array.from({ length: 40 }, (_, i) => avatarColor(`user-${i}`)));
    expect(spread.size).toBeGreaterThan(3);
  });
});

describe('UserMenu deal links', () => {
  it('links My deals and the wallet, and counts the deals waiting for this person', async () => {
    const user = userEvent.setup();
    const person = testUser();
    const { client, calls } = fakeApi({
      ...meRoute(person),
      'GET /api/v1/me/bookings/summary': { status: 200, body: { renter: { open: 2, needsAction: 1 }, owner: { open: 1, needsAction: 1 } } },
    });
    renderWithSession(<UserMenu user={person} />, { client });
    // Nothing is asked before the menu opens.
    expect(calls.some((c) => c.path.endsWith('/summary'))).toBe(false);
    await user.click(screen.getByRole('button', { name: new RegExp(`^${en.header.account}`) }));
    const deals = await screen.findByRole('menuitem', { name: /My deals.*2 wait for you/ });
    expect(deals).toHaveAttribute('href', '/bookings');
    expect(screen.getByRole('menuitem', { name: 'Wallet' })).toHaveAttribute('href', '/wallet');
  });
});
