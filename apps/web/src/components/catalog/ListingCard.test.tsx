import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import en from '../../../messages/en.json';
import { catalogItem } from '@/test/catalog';
import { apiError, fakeApi, meRoute, testUser } from '@/test/fake-api';
import { renderWithSession } from '@/test/render';
import { ListingCard } from './ListingCard';

vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/navigation')>()),
  usePathname: () => '/search',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

describe('ListingCard', () => {
  it('one link to the item, the price, deposit, discount and place; the photo box is sized before it loads', async () => {
    const api = fakeApi(meRoute(null));
    renderWithSession(<ListingCard item={catalogItem({ contentLocale: 'lv' })} />, { client: api.client, hasSession: false });
    const link = screen.getByRole('link', { name: 'Cordless drill' });
    expect(link).toHaveAttribute('href', '/listings/cm1abcdefg-cordless-drill');
    expect(link.closest('h3')).toHaveAttribute('lang', 'lv');
    expect(screen.getByText('€15 / day')).toBeInTheDocument();
    expect(screen.getByText('Deposit €50')).toBeInTheDocument();
    expect(screen.getByText('−10% for a week')).toBeInTheDocument();
    expect(screen.getByText('Rīga, Centrs')).toBeInTheDocument();
    const photo = document.querySelector('img')!;
    expect(photo).toHaveAttribute('width', '640');
    expect(photo).toHaveAttribute('height', '480');
  });

  it('puts the heart on the card, above the link (not below it)', async () => {
    const api = fakeApi(meRoute(null));
    renderWithSession(<ListingCard item={catalogItem()} />, { client: api.client, hasSession: false });
    const heart = await screen.findByRole('button', { name: 'Add “Cordless drill” to favourites' });
    expect(heart.className).toMatch(/(^|\s)absolute(\s|$)/);
    expect(heart.className).not.toMatch(/(^|\s)relative(\s|$)/);
  });
});

describe('HeartButton', () => {
  it('turns on at once, then puts itself back and says so when the API refuses', async () => {
    const user = userEvent.setup();
    let refuse = () => {};
    const refused = new Promise<void>((resolve) => (refuse = resolve));
    const api = fakeApi({
      ...meRoute(testUser()),
      'GET /api/v1/me/favorites/ids': { status: 200, body: { ids: [] } },
      // Held until the test has seen the heart on, then refused.
      'PUT /api/v1/me/favorites/cm1abcdefg': async () => {
        await refused;
        return apiError(500, 'INTERNAL');
      },
    });
    renderWithSession(<ListingCard item={catalogItem()} />, { client: api.client });
    const heart = await screen.findByRole('button', { name: 'Add “Cordless drill” to favourites' });
    await waitFor(() => expect(heart).toBeEnabled());
    await user.click(heart);
    await waitFor(() => expect(heart).toHaveAttribute('aria-pressed', 'true'));
    refuse();
    expect(await screen.findByText(new RegExp(en.favorites.addFailed))).toBeInTheDocument();
    await waitFor(() => expect(heart).toHaveAttribute('aria-pressed', 'false'));
  });

  it('keeps a saved one pressed and takes it off', async () => {
    const user = userEvent.setup();
    const saved = new Set(['cm1abcdefg']);
    const api = fakeApi({
      ...meRoute(testUser()),
      // The API remembers: after the DELETE the ids are empty.
      'GET /api/v1/me/favorites/ids': () => ({ status: 200, body: { ids: [...saved] } }),
      'DELETE /api/v1/me/favorites/cm1abcdefg': () => {
        saved.delete('cm1abcdefg');
        return { status: 204 };
      },
    });
    renderWithSession(<ListingCard item={catalogItem()} />, { client: api.client });
    const heart = await screen.findByRole('button', { name: 'Remove “Cordless drill” from favourites' });
    await waitFor(() => expect(heart).toBeEnabled());
    await user.click(heart);
    await waitFor(() => expect(heart).toHaveAttribute('aria-pressed', 'false'));
    expect(api.calls.some((call) => call.method === 'DELETE')).toBe(true);
  });

  it('is the photo with its text below, no tilted sticker badge (v16)', () => {
    const api = fakeApi(meRoute(null));
    const { container } = renderWithSession(<ListingCard item={catalogItem({ weeklyDiscountPercent: 10 })} />, { client: api.client, hasSession: false });
    const badge = screen.getByText(en.catalog.card.weekly.replace('{percent}', '10'));
    expect(badge.className).not.toMatch(/sticker|rotate/);
    expect(container.querySelector('[class*="perspective"]')).toBeNull();   // no tilting card
  });
});
