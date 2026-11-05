import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import en from '../../../../messages/en.json';
import { fakeApi, meRoute, testUser } from '@/test/fake-api';
import { categoriesRoute, echoListing, ownerListing } from '@/test/listings';
import { renderWithSession } from '@/test/render';
import { ListingBuilder } from '../ListingBuilder';

vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/navigation')>()),
  usePathname: () => '/listings/x/edit',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

const pr = en.builder.price;

function renderPrice(listing = ownerListing()) {
  const { client, calls } = fakeApi({ ...meRoute(testUser()), ...categoriesRoute, ...echoListing(listing) });
  renderWithSession(<ListingBuilder initial={listing} initialStep="price" />, { client });
  const patches = () =>
    calls.filter((c) => c.method === 'PATCH').map((c) => c.body as Record<string, unknown>);
  return { patches };
}

describe('PriceStep', () => {
  it('saves euros typed with a comma as cents', async () => {
    const user = userEvent.setup();
    const { patches } = renderPrice();
    await user.type(screen.getByLabelText(pr.daily), '12,50');
    await waitFor(() => expect(patches().at(-1)).toMatchObject({ dailyCents: 1250 }), { timeout: 3000 });
  });

  it('holds back a price under €1 and says why when leaving the field', async () => {
    const user = userEvent.setup();
    const { patches } = renderPrice();
    const daily = screen.getByLabelText(pr.daily);
    await user.type(daily, '0,50');
    await user.tab();
    expect(daily).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('From €1 to €10000 a day.')).toBeVisible();
    await new Promise((resolve) => setTimeout(resolve, 900));
    expect(patches().some((body) => 'dailyCents' in body)).toBe(false);
  });

  it('wants the longest rental to be at least the shortest', async () => {
    const user = userEvent.setup();
    renderPrice();
    await user.clear(screen.getByLabelText(pr.minDays));
    await user.type(screen.getByLabelText(pr.minDays), '5');
    await user.clear(screen.getByLabelText(pr.maxDays));
    await user.type(screen.getByLabelText(pr.maxDays), '3');
    await user.tab();
    expect(screen.getByLabelText(pr.maxDays)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText(en.builder.check.maxBelowMin)).toBeVisible();
  });

  it('shows what the owner receives for a day and for a week with the discount (as quote does)', async () => {
    renderPrice(ownerListing({ dailyCents: 1000, weeklyDiscountPercent: 10 }));
    const payout = screen.getByRole('region', { name: pr.payout });
    expect(within(payout).getByText('For 1 day')).toBeVisible();
    expect(within(payout).getByText('€10')).toBeVisible();
    expect(within(payout).getByText('For 7 days')).toBeVisible();
    expect(within(payout).getByText('€63')).toBeVisible(); // 7 × €10 − 10 %
  });
});
