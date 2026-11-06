import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithIntl } from '@/test/render';
import { LanguageSwitcher } from './LanguageSwitcher';

const location = vi.hoisted(() => ({ pathname: '/settings', search: '' }));
/** The router renders the new page: here it only sets <html lang>, as the layout does. */
const push = vi.hoisted(() =>
  vi.fn((_href: string, { locale }: { locale: string; scroll?: boolean }) => {
    setTimeout(() => document.documentElement.setAttribute('lang', locale), 0);
  }),
);

vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/navigation')>()),
  usePathname: () => location.pathname,
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  useSearchParams: () => new URLSearchParams(location.search),
}));

afterEach(() => {
  location.pathname = '/settings';
  location.search = '';
  push.mockClear();
  document.documentElement.setAttribute('lang', 'en');
});

const pill = (name: RegExp = /^Language: English/) => screen.getByRole('button', { name });
const items = () => screen.queryAllByRole('menuitemradio');

describe('one compact language pill', () => {
  it('shows the current language code and says the language in full (WCAG 2.5.3)', () => {
    renderWithIntl(<LanguageSwitcher />, 'lv');
    const button = screen.getByRole('button', { name: /^Valoda: Latviešu,\s*lv$/ });
    expect(button).toHaveAttribute('aria-haspopup', 'menu');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveTextContent(/lv$/);
    // Closed: nothing to pick yet, the menu is out of the accessibility tree.
    expect(items()).toHaveLength(0);
    // …but its links are in the page for crawlers and before hydration, never prefetched.
    const hidden = screen.getAllByRole('menuitemradio', { hidden: true });
    expect(hidden.map((item) => item.getAttribute('href'))).toEqual([
      '/en/settings',
      '/lv/settings',
      '/ru/settings',
    ]);
  });

  it('opens a menu of the three languages in their own language, the current one checked', async () => {
    const user = userEvent.setup();
    renderWithIntl(<LanguageSwitcher />, 'ru');
    const button = pill(/^Язык: Русский/);
    await user.click(button);

    expect(button).toHaveAttribute('aria-expanded', 'true');
    const menu = screen.getByRole('menu', { name: 'Язык' });
    expect(button).toHaveAttribute('aria-controls', menu.id);
    const [english, latvian, russian] = items();
    expect(english).toHaveAccessibleName('English');
    expect(latvian).toHaveAccessibleName('Latviešu');
    expect(russian).toHaveAccessibleName('Русский');
    expect(items().map((item) => [item.getAttribute('lang'), item.getAttribute('hreflang')])).toEqual([
      ['en', 'en'],
      ['lv', 'lv'],
      ['ru', 'ru'],
    ]);
    expect(screen.getByRole('menuitemradio', { name: 'Русский' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('menuitemradio', { name: 'English' })).toHaveAttribute('aria-checked', 'false');
    // The focus lands on the current language.
    expect(screen.getByRole('menuitemradio', { name: 'Русский' })).toHaveFocus();
  });

  it('keeps the reset link token and where to go next (else the link is lost)', async () => {
    location.pathname = '/reset-password';
    location.search = 'token=abc123&next=%2Fsettings';
    const user = userEvent.setup();
    renderWithIntl(<LanguageSwitcher />, 'ru');
    await user.click(pill(/^Язык: Русский/));
    expect(screen.getByRole('menuitemradio', { name: 'English' })).toHaveAttribute(
      'href',
      '/en/reset-password?token=abc123&next=%2Fsettings',
    );
    expect(screen.getByRole('menuitemradio', { name: 'Latviešu' })).toHaveAttribute(
      'href',
      '/lv/reset-password?token=abc123&next=%2Fsettings',
    );
  });
});

describe('keyboard', () => {
  it('arrow keys move and wrap, Home and End jump', async () => {
    const user = userEvent.setup();
    renderWithIntl(<LanguageSwitcher />);
    await user.click(pill());
    const [en, lv, ru] = items();
    expect(en).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(lv).toHaveFocus();
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(en).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(ru).toHaveFocus();
    await user.keyboard('{Home}');
    expect(en).toHaveFocus();
    await user.keyboard('{End}');
    expect(ru).toHaveFocus();
  });

  it('opens from the button with Enter, Space, ArrowDown (first) and ArrowUp (last)', async () => {
    const user = userEvent.setup();
    renderWithIntl(<LanguageSwitcher />, 'lv');
    const button = pill(/^Valoda: Latviešu/);
    button.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('menuitemradio', { name: 'Latviešu' })).toHaveFocus();
    await user.keyboard('{Escape}');
    await user.keyboard(' ');
    expect(screen.getByRole('menuitemradio', { name: 'Latviešu' })).toHaveFocus();
    await user.keyboard('{Escape}');
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitemradio', { name: 'English' })).toHaveFocus();
    await user.keyboard('{Escape}');
    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('menuitemradio', { name: 'Русский' })).toHaveFocus();
  });

  it('type-ahead finds a language by its name or its code', async () => {
    const user = userEvent.setup();
    renderWithIntl(<LanguageSwitcher />);
    await user.click(pill());
    await user.keyboard('l');
    expect(screen.getByRole('menuitemradio', { name: 'Latviešu' })).toHaveFocus();
    await user.keyboard('р'); // Cyrillic, as typed on a Russian keyboard
    expect(screen.getByRole('menuitemradio', { name: 'Русский' })).toHaveFocus();
    await user.keyboard('e');
    expect(screen.getByRole('menuitemradio', { name: 'English' })).toHaveFocus();
    await user.keyboard('r'); // the code "ru"
    expect(screen.getByRole('menuitemradio', { name: 'Русский' })).toHaveFocus();
  });

  it('Escape closes the menu and returns the focus to the pill', async () => {
    const user = userEvent.setup();
    renderWithIntl(<LanguageSwitcher />);
    const button = pill();
    await user.click(button);
    await user.keyboard('{Escape}');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(items()).toHaveLength(0);
    expect(button).toHaveFocus();
  });

  it('Tab closes the menu and moves on', async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <>
        <LanguageSwitcher />
        <button type="button">next</button>
      </>,
    );
    await user.click(pill());
    await user.tab();
    expect(pill()).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('pointer and touch', () => {
  it('a click (or a tap) outside closes the menu; a second click on the pill too', async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <>
        <LanguageSwitcher />
        <p>elsewhere</p>
      </>,
    );
    await user.click(pill());
    fireEvent.pointerDown(screen.getByText('elsewhere'), { pointerType: 'touch' });
    expect(pill()).toHaveAttribute('aria-expanded', 'false');
    await user.click(pill());
    await user.click(pill());
    expect(pill()).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('choosing a language', () => {
  it('switches through the router, keeping the query and the scroll position', async () => {
    location.pathname = '/reset-password';
    location.search = 'token=abc123';
    const user = userEvent.setup();
    renderWithIntl(<LanguageSwitcher />);
    await user.click(pill());

    await user.click(screen.getByRole('menuitemradio', { name: 'Latviešu' }));

    expect(push).toHaveBeenCalledExactlyOnceWith('/reset-password?token=abc123', {
      locale: 'lv',
      scroll: false,
    });
    expect(pill()).toHaveAttribute('aria-expanded', 'false');
  });

  it('Enter and Space on a language switch to it', async () => {
    const user = userEvent.setup();
    renderWithIntl(<LanguageSwitcher />);
    await user.click(pill());
    await user.keyboard('{ArrowDown}{Enter}');
    expect(push).toHaveBeenLastCalledWith('/settings', { locale: 'lv', scroll: false });
    await user.click(pill());
    await user.keyboard('{End} ');
    expect(push).toHaveBeenLastCalledWith('/settings', { locale: 'ru', scroll: false });
  });

  it('leaves a click with a modifier (new tab) and the current language to the link', async () => {
    const user = userEvent.setup();
    renderWithIntl(<LanguageSwitcher />);
    await user.click(pill());
    const latvian = screen.getByRole('menuitemradio', { name: 'Latviešu' });
    latvian.addEventListener('click', (event) => event.preventDefault()); // jsdom cannot open a tab

    await user.keyboard('{Control>}');
    await user.click(latvian);
    await user.keyboard('{/Control}');
    await user.click(screen.getByRole('menuitemradio', { name: 'English' }));

    expect(push).not.toHaveBeenCalled();
  });

  it('moves the focus without scrolling the page (the header may be half out of sight)', async () => {
    // The focus calls this component makes (not the ones user-event makes to click).
    const ours: (FocusOptions | undefined)[] = [];
    const focus = HTMLElement.prototype.focus;
    const spy = vi.spyOn(HTMLElement.prototype, 'focus').mockImplementation(function (
      this: HTMLElement,
      options,
    ) {
      if (new Error().stack?.includes('LanguageSwitcher.tsx')) ours.push(options);
      focus.call(this, options);
    });
    const user = userEvent.setup();
    renderWithIntl(<LanguageSwitcher />);
    await user.click(pill());
    await user.keyboard('{ArrowDown}l{Escape}');
    await user.click(pill());
    await user.click(screen.getByRole('menuitemradio', { name: 'Русский' }));
    expect(ours.length).toBeGreaterThanOrEqual(5);
    for (const options of ours) expect(options).toEqual({ preventScroll: true });
    spy.mockRestore();
  });

  it('gives the focus back to the pill once the new language is there', async () => {
    const user = userEvent.setup();
    renderWithIntl(<LanguageSwitcher />);
    const button = pill();
    await user.click(button);

    await user.click(screen.getByRole('menuitemradio', { name: 'Русский' }));

    expect(push).toHaveBeenCalledExactlyOnceWith('/settings', { locale: 'ru', scroll: false });
    await waitFor(() => expect(button).toHaveFocus());
  });
});
