import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import en from '../../../messages/en.json';
import { fakeApi, meRoute, testUser } from '@/test/fake-api';
import { categoriesRoute, ownerListing } from '@/test/listings';
import { renderWithSession } from '@/test/render';
import { EditListing } from './EditListing';

vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/navigation')>()),
  usePathname: () => '/listings/listing-1/edit',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

function Toggle() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button type="button" onClick={() => setOpen((value) => !value)}>
        toggle
      </button>
      {open && <EditListing id="listing-1" initialStep="basics" />}
    </>
  );
}

describe('EditListing', () => {
  it('loads the stored listing again on every visit, never an old copy (its version would be stale)', async () => {
    const user = userEvent.setup();
    let stored = ownerListing({ title: 'First title', version: 1 });
    const { client } = fakeApi({
      ...meRoute(testUser()),
      ...categoriesRoute,
      'GET /api/v1/listings/listing-1': () => ({ status: 200, body: { listing: stored } }),
    });
    renderWithSession(<Toggle />, { client });
    expect(await screen.findByLabelText(en.builder.basics.title)).toHaveValue('First title');

    await user.click(screen.getByRole('button', { name: 'toggle' }));
    stored = ownerListing({ title: 'Changed elsewhere', version: 2 });
    await user.click(screen.getByRole('button', { name: 'toggle' }));
    expect(await screen.findByDisplayValue('Changed elsewhere')).toBeVisible();
  });

  it('says "not found" for a listing that is not there (or someone else’s)', async () => {
    const { client } = fakeApi({ ...meRoute(testUser()), ...categoriesRoute });
    renderWithSession(<EditListing id="listing-1" initialStep="basics" />, { client });
    expect(await screen.findByRole('heading', { level: 1, name: en.builder.notFound.title })).toBeVisible();
  });
});
