import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithIntl } from '@/test/render';
import { CountryPicker } from './CountryPicker';

const refresh = vi.fn();
vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/navigation')>()),
  useRouter: () => ({ refresh, push: vi.fn(), replace: vi.fn() }),
}));

describe('CountryPicker', () => {
  it('shows the country, lists the Baltic states by name (owner, 2026-11-19), and keeps a choice in a cookie', async () => {
    const user = userEvent.setup();
    renderWithIntl(<CountryPicker country="LV" />);
    await user.click(screen.getByRole('button', { name: /^Country: Latvia\s*LV$/ }));
    const dialog = screen.getByRole('dialog', { name: 'Your country' });
    expect(dialog.querySelectorAll('ul button')).toHaveLength(3);
    expect(screen.getByRole('button', { name: /Latvia/, pressed: true })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Lithuania/ }));
    expect(document.cookie).toContain('yoyo-country=LT');
    expect(refresh).toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
