import { act, waitFor } from '@testing-library/react';
import type { OwnerListing } from '@yoyo/shared';
import { describe, expect, it, vi } from 'vitest';
import { apiError, fakeApi, meRoute, testUser, type FakeRoutes } from '@/test/fake-api';
import { echoListing, ownerListing } from '@/test/listings';
import { renderWithSession } from '@/test/render';
import { useApiClient } from '@/lib/session/SessionProvider';
import { useListingDraft, type ListingDraft } from './use-listing-draft';

function setup(initial: OwnerListing | null, routes: FakeRoutes, onCreated = vi.fn()) {
  const { client, calls } = fakeApi({ ...meRoute(testUser()), ...routes });
  const draft: { current: ListingDraft | null } = { current: null };
  function Harness() {
    draft.current = useListingDraft({
      initial,
      client: useApiClient(),
      category: () => undefined,
      onCreated,
      delayMs: 20,
    });
    return null;
  }
  renderWithSession(<Harness />, { client });
  const patches = () => calls.filter((c) => c.method === 'PATCH');
  return { draft: () => draft.current!, calls, patches, onCreated };
}

describe('useListingDraft', () => {
  it('sends several quick changes as one PATCH with the version it saw', async () => {
    const { draft, patches } = setup(ownerListing({ version: 4 }), echoListing(ownerListing({ version: 4 })));
    act(() => draft().change({ title: 'Dr' }));
    act(() => draft().change({ title: 'Drill' }));
    act(() => draft().change({ dailyCents: 500 }));
    expect(draft().state).toBe('saving'); // never "saved" over changes not sent yet

    await waitFor(() => expect(draft().state).toBe('saved'));
    expect(patches()).toHaveLength(1);
    expect(patches()[0]!.body).toEqual({ title: 'Drill', dailyCents: 500, version: 4 });
    expect(draft().listing?.version).toBe(5);

    act(() => draft().change({ title: 'Drill set' }));
    await waitFor(() => expect(patches()).toHaveLength(2));
    expect(patches()[1]!.body).toMatchObject({ version: 5 });
  });

  it('creates the draft on the first change', async () => {
    const created = ownerListing({ id: 'new-1', title: 'Tent' });
    const { draft, calls, onCreated } = setup(null, {
      'POST /api/v1/listings': { status: 201, body: { listing: created } },
      ...echoListing(created),
    });
    act(() => draft().change({ title: 'Tent' }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(created));
    expect(calls.find((c) => c.method === 'POST')?.body).toEqual({ title: 'Tent' });
    act(() => draft().change({ title: 'Tent for 4' }));
    await waitFor(() =>
      expect(calls.some((c) => c.method === 'PATCH' && c.path === '/api/v1/listings/new-1')).toBe(true),
    );
  });

  it('stops on a stale version instead of overwriting the other tab', async () => {
    const { draft, patches } = setup(ownerListing({ version: 1 }), echoListing(ownerListing({ version: 2 })));
    act(() => draft().change({ title: 'Mine' }));
    await waitFor(() => expect(draft().state).toBe('conflict'));

    act(() => draft().change({ title: 'Mine again' }));
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(patches()).toHaveLength(1);

    await act(() => draft().reload());
    expect(draft().state).toBe('idle');
    expect(draft().listing?.version).toBe(2);
  });

  it('holds back a field the API would refuse, and sends the rest', async () => {
    const { draft, patches } = setup(ownerListing(), echoListing(ownerListing()));
    act(() => draft().change({ title: 'x'.repeat(81), city: 'Rīga' }));
    await waitFor(() => expect(patches()).toHaveLength(1));
    expect(patches()[0]!.body).toEqual({ city: 'Rīga', version: 0 });
    await waitFor(() => expect(draft().state).toBe('invalid'));
  });

  it('shows the API’s field errors and keeps the values', async () => {
    const { draft } = setup(ownerListing(), {
      'PATCH /api/v1/listings/listing-1': apiError(400, 'LISTING_INCOMPLETE', {
        fields: { title: 'Required' },
      }),
    });
    act(() => draft().change({ title: '' }));
    await waitFor(() => expect(draft().serverErrors).toEqual({ title: 'Required' }));
    expect(draft().state).toBe('invalid');
  });

  it('creates the draft before a photo upload on a new listing, in the same queue', async () => {
    const created = ownerListing({ id: 'new-2' });
    const { draft, calls } = setup(null, {
      'POST /api/v1/listings': { status: 201, body: { listing: created } },
    });
    await act(() =>
      draft().withListing(async (listing) => {
        expect(listing.id).toBe('new-2');
        return (current) => ({ ...current, version: 7 });
      }),
    );
    expect(calls.filter((c) => c.method === 'POST')).toHaveLength(1);
    expect(draft().listing?.version).toBe(7);
  });

  it('never edits an archived listing', async () => {
    const { draft, patches } = setup(ownerListing({ status: 'ARCHIVED' }), echoListing(ownerListing()));
    expect(draft().state).toBe('readonly');
    act(() => draft().change({ title: 'Nope' }));
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(patches()).toHaveLength(0);
    expect(draft().values.title).toBe('');
  });
});
