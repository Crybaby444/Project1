import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GEO_ATTRIBUTION } from '@yoyo/shared';
import { describe, expect, it, vi } from 'vitest';
import en from '../../../../messages/en.json';
import { apiError, fakeApi, meRoute, testUser, type FakeRoutes } from '@/test/fake-api';
import { renderWithSession } from '@/test/render';
import { AddressSearch } from './AddressSearch';

const pl = en.builder.place;
const riga = {
  label: 'Brīvības iela 1, Centrs, Rīga',
  city: 'Rīga',
  district: 'Centrs',
  lat: 56.949649,
  lng: 24.105186,
};
const jurmala = {
  label: 'Jomas iela, Majori, Jūrmala',
  city: 'Jūrmala',
  district: 'Majori',
  lat: 56.968,
  lng: 23.7703,
};

function renderSearch(routes: FakeRoutes) {
  const { client, calls } = fakeApi({ ...meRoute(testUser()), ...routes });
  const onSelect = vi.fn();
  renderWithSession(<AddressSearch onSelect={onSelect} disabled={false} />, { client });
  return { onSelect, searches: () => calls.filter((c) => c.path === '/api/v1/geo/search') };
}

describe('AddressSearch', () => {
  it('searches once the typing stops and picks a place with the keyboard', async () => {
    const user = userEvent.setup();
    const { onSelect, searches } = renderSearch({
      'GET /api/v1/geo/search': {
        status: 200,
        body: { results: [riga, jurmala], attribution: GEO_ATTRIBUTION },
      },
    });
    const box = screen.getByRole('combobox', { name: pl.search });
    await user.type(box, 'Brīvības 1');
    expect(await screen.findByRole('option', { name: riga.label })).toBeVisible();
    expect(searches()).toHaveLength(1);
    expect(new URLSearchParams(searches()[0]!.query).get('q')).toBe('Brīvības 1');
    expect(new URLSearchParams(searches()[0]!.query).get('lang')).toBe('en');
    expect(screen.getByText(GEO_ATTRIBUTION)).toBeVisible();

    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(box).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: jurmala.label }).id,
    );
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith(jurmala);
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('says when nothing was found', async () => {
    const user = userEvent.setup();
    renderSearch({
      'GET /api/v1/geo/search': { status: 200, body: { results: [], attribution: GEO_ATTRIBUTION } },
    });
    await user.type(screen.getByRole('combobox'), 'nowhere');
    expect(await screen.findByText(pl.noResults)).toBeVisible();
  });

  it('explains when address search is down', async () => {
    const user = userEvent.setup();
    renderSearch({ 'GET /api/v1/geo/search': apiError(503, 'GEO_UNAVAILABLE') });
    await user.type(screen.getByRole('combobox'), 'Rīga');
    await waitFor(() => expect(screen.getByText(en.errors.GEO_UNAVAILABLE)).toBeVisible());
  });
});
