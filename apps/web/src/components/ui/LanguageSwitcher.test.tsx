import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithIntl } from '@/test/render';
import { LanguageMenu } from './LanguageSwitcher';

vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/navigation')>()),
  usePathname: () => '/settings',
}));

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
