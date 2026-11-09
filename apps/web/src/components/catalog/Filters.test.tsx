import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import en from '../../../messages/en.json';
import { parseCatalogParams } from '@/lib/catalog/params';

const replace = vi.fn();
vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/navigation')>()),
  usePathname: () => '/search',
  useRouter: () => ({ replace, push: vi.fn(), refresh: vi.fn() }),
}));

const { CatalogShell } = await import('./CatalogShell');
const { Filters } = await import('./Filters');

function ui(query: string) {
  return (
    <NextIntlClientProvider locale="en" messages={en}>
      <CatalogShell>
        <Filters params={parseCatalogParams(new URLSearchParams(query))} districts={[]} today="2026-11-09" total={1} />
      </CatalogShell>
    </NextIntlClientProvider>
  );
}

describe('Filters', () => {
  it('keeps the typed "to" price when the "from" price lands in the address', async () => {
    const user = userEvent.setup();
    const { rerender } = render(ui('q=drill'));
    const from = screen.getAllByLabelText(en.catalog.filters.priceFrom)[0]!;
    const to = screen.getAllByLabelText(en.catalog.filters.priceTo)[0]!;

    await user.type(from, '10');
    await user.click(to); // blur applies "from"
    expect(replace).toHaveBeenLastCalledWith('/search?q=drill&price_min=10', { scroll: false });
    await user.type(to, '20');

    // The navigation for "from" lands while "to" is being typed.
    rerender(ui('q=drill&price_min=10'));
    expect(to).toHaveValue('20');

    await user.type(to, '{Enter}');
    expect(replace).toHaveBeenLastCalledWith('/search?q=drill&price_min=10&price_max=20', { scroll: false });
  });

  it('follows the address when a price is removed elsewhere', () => {
    const { rerender } = render(ui('price_min=10&price_max=20'));
    rerender(ui('price_min=10'));
    expect(screen.getAllByLabelText(en.catalog.filters.priceTo)[0]).toHaveValue('');
    expect(screen.getAllByLabelText(en.catalog.filters.priceFrom)[0]).toHaveValue('10');
  });
});
