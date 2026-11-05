import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GEO_ATTRIBUTION } from '@yoyo/shared';
import { describe, expect, it, vi } from 'vitest';
import en from '../../../../messages/en.json';
import { fakeApi, meRoute, testUser } from '@/test/fake-api';
import { categoriesRoute, echoListing, ownerListing } from '@/test/listings';
import { renderWithSession } from '@/test/render';
import { ListingBuilder } from '../ListingBuilder';

// Leaflet needs a real browser (e2e covers the map); here it is a stand-in that reports a click.
vi.mock('./LocationMap', () => ({
  LocationMap: ({ onPick }: { onPick(lat: number, lng: number): void }) => (
    <button type="button" onClick={() => onPick(56.968, 23.7703)}>
      fake map
    </button>
  ),
}));
vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/navigation')>()),
  usePathname: () => '/listings/x/edit',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

const pl = en.builder.place;
const riga = {
  label: 'Brīvības iela 1, Centrs, Rīga',
  city: 'Rīga',
  district: 'Centrs',
  lat: 56.949649,
  lng: 24.105186,
};

function renderPlaceWithCalls() {
  return renderPlaceInner().calls;
}

function renderPlace() {
  const { calls } = renderPlaceInner();
  return () => calls.filter((c) => c.method === 'PATCH').map((c) => c.body as Record<string, unknown>);
}

function renderPlaceInner() {
  const listing = ownerListing();
  const { client, calls } = fakeApi({
    ...meRoute(testUser()),
    ...categoriesRoute,
    ...echoListing(listing),
    'GET /api/v1/geo/search': { status: 200, body: { results: [riga], attribution: GEO_ATTRIBUTION } },
    'GET /api/v1/geo/reverse': {
      status: 200,
      body: { city: 'Jūrmala', district: 'Majori', attribution: GEO_ATTRIBUTION },
    },
    'PUT /api/v1/listings/listing-1/unavailability': (body) => ({
      status: 200,
      body: { periods: (body as { periods: unknown }).periods, version: 9 },
    }),
  });
  renderWithSession(<ListingBuilder initial={listing} initialStep="place" />, { client });
  return { calls };
}

describe('PlaceStep', () => {
  it('sets the point, city and district from a found address; the preview shows only the district', async () => {
    const user = userEvent.setup();
    const patches = renderPlace();
    await user.type(screen.getByRole('combobox', { name: pl.search }), 'Brīvības');
    await user.click(await screen.findByRole('option', { name: riga.label }));

    await waitFor(
      () =>
        expect(patches().at(-1)).toMatchObject({
          lat: riga.lat,
          lng: riga.lng,
          city: 'Rīga',
          district: 'Centrs',
        }),
      {
        timeout: 3000,
      },
    );
    expect(screen.getByLabelText(pl.city)).toHaveValue('Rīga');
    const preview = screen.getAllByRole('figure', { name: en.builder.preview.label })[0]!;
    expect(within(preview).getByText('Rīga, Centrs')).toBeVisible();
    expect(preview.innerHTML).not.toMatch(/56[.,]9|24[.,]1/);
  });

  it('fills the city and district from the point picked on the map', async () => {
    const user = userEvent.setup();
    const patches = renderPlace();
    await user.click(screen.getByRole('button', { name: 'fake map' }));
    await waitFor(() => expect(screen.getByLabelText(pl.district)).toHaveValue('Majori'));
    await waitFor(
      () =>
        expect(patches().at(-1)).toMatchObject({
          lat: 56.968,
          lng: 23.7703,
          city: 'Jūrmala',
          district: 'Majori',
        }),
      {
        timeout: 3000,
      },
    );
  });

  it('sends a date change still waiting when the person moves to another step', async () => {
    const user = userEvent.setup();
    const calls = renderPlaceWithCalls();
    await user.click(
      screen
        .getAllByRole('button', { name: /, 20\d\d$/ })
        .find((day) => day.getAttribute('aria-disabled') !== 'true')!,
    );
    await user.click(screen.getByRole('link', { name: /Price/ }));
    await waitFor(() =>
      expect(calls.some((c) => c.method === 'PUT' && c.path.endsWith('/unavailability'))).toBe(true),
    );
  });

  it('credits OpenStreetMap and says who sees the point', () => {
    renderPlace();
    expect(screen.getByText(pl.privacy)).toBeVisible();
  });
});
