import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import en from '../../../messages/en.json';
import { parseCatalogParams } from '@/lib/catalog/params';
import { renderWithIntl } from '@/test/render';
import { ActiveFilters } from './ActiveFilters';

const replace = vi.fn();
vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/navigation')>()),
  usePathname: () => '/c/tools',
  useRouter: () => ({ replace, push: vi.fn(), refresh: vi.fn() }),
}));

const { CatalogShell } = await import('./CatalogShell');

describe('ActiveFilters', () => {
  it('shows each filter as a removable chip, and removing one keeps the others', async () => {
    const user = userEvent.setup();
    const params = parseCatalogParams(new URLSearchParams('price_min=10&price_max=20&district=centrs&sort=price_asc'));
    renderWithIntl(
      <CatalogShell>
        <ActiveFilters params={params} districts={[{ district: 'Centrs', slug: 'centrs', count: 4 }]} />
      </CatalogShell>,
    );
    await user.click(screen.getByRole('button', { name: 'Remove the filter: €10–20 a day' }));
    expect(replace).toHaveBeenLastCalledWith('/c/tools?district=centrs&sort=price_asc', { scroll: false });
    await user.click(screen.getByRole('button', { name: en.catalog.active.resetAll }));
    // Reset all clears the sort too: the list goes back to how the category opens.
    expect(replace).toHaveBeenLastCalledWith('/c/tools', { scroll: false });
  });

  it('draws a filter as a quiet outlined pill: no sticker colour, no tilt (v16)', () => {
    const params = parseCatalogParams(new URLSearchParams('price_min=10&price_max=20'));
    renderWithIntl(
      <CatalogShell>
        <ActiveFilters params={params} districts={[]} />
      </CatalogShell>,
    );
    const chip = screen.getByRole('button', { name: 'Remove the filter: €10–20 a day' });
    expect(chip.className).not.toMatch(/sticker|rotate/);
  });
});
