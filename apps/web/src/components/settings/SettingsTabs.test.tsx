import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import en from '../../../messages/en.json';
import { renderWithIntl } from '@/test/render';
import { SettingsTabs } from './SettingsTabs';

vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/navigation')>()),
  usePathname: () => '/settings/security',
}));

describe('SettingsTabs', () => {
  it('links Profile and Security and marks the open one', () => {
    renderWithIntl(<SettingsTabs />);
    const nav = screen.getByRole('navigation', { name: en.settings.title });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole('link', { name: en.settings.tabs.profile })).toHaveAttribute('href', '/settings');
    expect(screen.getByRole('link', { name: en.settings.tabs.profile })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: en.settings.tabs.security })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});
