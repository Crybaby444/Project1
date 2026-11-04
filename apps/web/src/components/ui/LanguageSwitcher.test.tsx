import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithIntl } from '@/test/render';
import { LanguageMenu, LanguageSwitcher } from './LanguageSwitcher';

const location = vi.hoisted(() => ({ pathname: '/settings', search: '' }));

vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/navigation')>()),
  usePathname: () => location.pathname,
}));

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  useSearchParams: () => new URLSearchParams(location.search),
}));

afterEach(() => {
  location.pathname = '/settings';
  location.search = '';
});

describe('switching the language keeps the whole address', () => {
  it('keeps the reset link token and where to go next (else the link is lost)', async () => {
    location.pathname = '/reset-password';
    location.search = 'token=abc123&next=%2Fsettings';
    const user = userEvent.setup();
    renderWithIntl(<LanguageSwitcher />);
    expect(screen.getByRole('link', { name: 'Latviešu' })).toHaveAttribute(
      'href',
      '/lv/reset-password?token=abc123&next=%2Fsettings',
    );
    renderWithIntl(<LanguageMenu />, 'ru');
    await user.click(screen.getByRole('button', { name: /^Язык: Русский/ }));
    expect(screen.getAllByRole('link', { name: 'English' }).at(-1)).toHaveAttribute(
      'href',
      '/en/reset-password?token=abc123&next=%2Fsettings',
    );
  });
});

describe('LanguageMenu (narrow screens)', () => {
  it('folds the languages into one button that lists them, keeping the page', async () => {
    const user = userEvent.setup();
    renderWithIntl(<LanguageMenu />, 'lv');
    const button = screen.getByRole('button', { name: /^Valoda: Latviešu/ });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link')).toBeNull();

    await user.click(button);

    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'Русский' })).toHaveAttribute('href', '/ru/settings');
    expect(screen.getByRole('link', { name: 'Latviešu' })).toHaveAttribute('aria-current', 'true');
  });

  it('closes with Esc, back on the button', async () => {
    const user = userEvent.setup();
    renderWithIntl(<LanguageMenu />);
    const button = screen.getByRole('button', { name: /^Language: English/ });
    await user.click(button);
    await user.tab();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('link')).toBeNull();
    expect(button).toHaveFocus();
  });
});
