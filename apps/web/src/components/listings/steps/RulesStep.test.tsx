import { screen, waitFor } from '@testing-library/react';
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

const r = en.builder.rules;

function renderRules(listing = ownerListing()) {
  const { client, calls } = fakeApi({ ...meRoute(testUser()), ...categoriesRoute, ...echoListing(listing) });
  renderWithSession(<ListingBuilder initial={listing} initialStep="rules" />, { client });
  return () => calls.filter((c) => c.method === 'PATCH').map((c) => c.body as Record<string, unknown>);
}

describe('RulesStep', () => {
  it('saves ticked ready-made rules', async () => {
    const user = userEvent.setup();
    const patches = renderRules();
    await user.click(screen.getByRole('checkbox', { name: en.listingRules.ID_AT_PICKUP }));
    await user.click(screen.getByRole('checkbox', { name: en.listingRules.NO_SMOKING }));
    await waitFor(
      () =>
        expect(patches().at(-1)).toMatchObject({
          rules: { preset: ['ID_AT_PICKUP', 'NO_SMOKING'], custom: [] },
        }),
      {
        timeout: 3000,
      },
    );
  });

  it('adds own rules up to five and checks their length', async () => {
    const user = userEvent.setup();
    const patches = renderRules(
      ownerListing({ rules: { preset: [], custom: ['Return it charged', 'b1', 'c22', 'd333'] } }),
    );
    await user.click(screen.getByRole('button', { name: r.add }));
    expect(screen.getByRole('button', { name: r.add })).toBeDisabled();
    await user.type(screen.getByLabelText('Rule 5'), 'No stickers on it');
    await user.tab();
    // Autosave holds the too-short rule 2 back, and it says why.
    await waitFor(() => expect(screen.getByLabelText('Rule 2')).toHaveAttribute('aria-invalid', 'true'), {
      timeout: 3000,
    });
    expect(screen.getByText('At least 3 characters.')).toBeVisible();
    // A rule too short is held back; the whole set is saved once it is fixed.
    await user.type(screen.getByLabelText('Rule 2'), '22');
    await waitFor(
      () =>
        expect(patches().at(-1)).toMatchObject({
          rules: { custom: ['Return it charged', 'b122', 'c22', 'd333', 'No stickers on it'] },
        }),
      { timeout: 3000 },
    );
  });

  it('removes a rule', async () => {
    const user = userEvent.setup();
    const patches = renderRules(ownerListing({ rules: { preset: [], custom: ['Return it charged'] } }));
    await user.click(screen.getByRole('button', { name: 'Remove rule 1' }));
    await waitFor(() => expect(patches().at(-1)).toMatchObject({ rules: { custom: [] } }), { timeout: 3000 });
  });
});
