import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import en from '../../../../messages/en.json';
import { apiError, fakeApi, meRoute, testUser, type FakeRoutes } from '@/test/fake-api';
import { categoriesRoute, echoListing, ownerListing } from '@/test/listings';
import { renderWithSession } from '@/test/render';
import { ListingBuilder } from '../ListingBuilder';

const push = vi.fn();
vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/navigation')>()),
  usePathname: () => '/listings/x/edit',
  useRouter: () => ({ replace: vi.fn(), push, refresh: vi.fn() }),
}));

const s = en.builder.submit;
const photo = {
  id: 'p1',
  width: 800,
  height: 600,
  position: 0,
  urls: { thumb: '/t', card: '/c', full: '/f' },
};
const ready = ownerListing({
  categoryId: 'cat-consoles',
  title: 'PlayStation 5',
  description: 'A PS5 with two controllers, ready for a weekend of games.',
  condition: 'GOOD',
  attributes: { model: 'ps5' },
  dailyCents: 1500,
  city: 'Rīga',
  district: 'Centrs',
  lat: 56.95,
  lng: 24.1,
  photos: [photo],
  version: 5,
});

function renderSubmit(listing = ready, routes: FakeRoutes = {}) {
  const { client, calls } = fakeApi({
    ...meRoute(testUser()),
    ...categoriesRoute,
    ...echoListing(listing),
    ...routes,
  });
  renderWithSession(<ListingBuilder initial={listing} initialStep="rules" />, { client });
  return calls;
}

describe('SubmitPanel', () => {
  beforeEach(() => {
    push.mockClear();
  });

  it('lists what review still needs, by step, with links to the steps', async () => {
    renderSubmit(ownerListing({ title: 'Drill' }));
    const left = await screen.findByRole('list', { name: s.left });
    expect(within(left).getByRole('link', { name: /^Photos: 1 field$/ })).toHaveAttribute(
      'href',
      '?step=photos',
    );
    expect(within(left).getByRole('link', { name: /^Price: 1 field$/ })).toHaveAttribute(
      'href',
      '?step=price',
    );
    expect(within(left).getByRole('link', { name: /^Basics: 3 fields$/ })).toBeVisible();
  });

  it('shows every missing field after a send attempt and sends nothing', async () => {
    const user = userEvent.setup();
    const calls = renderSubmit(ownerListing());
    await user.click(screen.getByRole('button', { name: s.send }));
    expect(screen.getByRole('list', { name: s.left })).toHaveFocus();
    expect(calls.some((c) => c.path.endsWith('/submit'))).toBe(false);
    await user.click(
      within(screen.getByRole('list', { name: s.left })).getByRole('link', { name: /^Basics/ }),
    );
    expect(screen.getByLabelText(en.builder.basics.title)).toHaveAttribute('aria-invalid', 'true');
  });

  it('sends a complete listing and goes to my items', async () => {
    const user = userEvent.setup();
    const calls = renderSubmit(ready, {
      'POST /api/v1/listings/listing-1/submit': {
        status: 200,
        body: { listing: { ...ready, status: 'PENDING_REVIEW' } },
      },
    });
    expect(await screen.findByText(s.ready)).toBeVisible();
    await user.click(screen.getByRole('button', { name: s.send }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard/lending'));
    expect(calls.some((c) => c.path === '/api/v1/listings/listing-1/submit')).toBe(true);
  });

  it('turns the API’s LISTING_INCOMPLETE into links to its steps', async () => {
    const user = userEvent.setup();
    renderSubmit(ready, {
      'POST /api/v1/listings/listing-1/submit': apiError(400, 'LISTING_INCOMPLETE', {
        fields: { 'attributes.model': 'Required' },
        details: { steps: ['attributes'] },
      }),
    });
    await user.click(await screen.findByRole('button', { name: s.send }));
    const left = await screen.findByRole('list', { name: s.left });
    expect(within(left).getByRole('link', { name: /^Details/ })).toHaveAttribute('href', '?step=attributes');
  });
});

describe('listing states in the builder', () => {
  it('shows a rejected listing’s reason and a way to send it again', () => {
    renderSubmit({ ...ready, status: 'REJECTED', rejectionReason: 'The photos show a different console.' });
    const banner = screen.getByRole('region', { name: en.listingStatus.REJECTED });
    expect(within(banner).getByText('The photos show a different console.')).toBeVisible();
    expect(within(banner).getByRole('link', { name: en.builder.status.REJECTED_link })).toHaveAttribute(
      'href',
      '?step=rules',
    );
  });

  it('warns what sends a published listing back to review, and hides it on request', async () => {
    const user = userEvent.setup();
    const calls = renderSubmit(
      { ...ready, status: 'PUBLISHED', publishedAt: '2026-11-03T10:00:00.000Z' },
      {
        'POST /api/v1/listings/listing-1/hide': {
          status: 200,
          body: { listing: { ...ready, status: 'HIDDEN', version: 6 } },
        },
      },
    );
    const banner = screen.getByRole('region', { name: en.listingStatus.PUBLISHED });
    expect(within(banner).getByText(en.builder.status.PUBLISHED)).toBeVisible();
    expect(screen.queryByRole('button', { name: s.send })).toBeNull();
    await user.click(within(banner).getByRole('button', { name: en.listingActions.hide }));
    expect(await screen.findByRole('region', { name: en.listingStatus.HIDDEN })).toBeVisible();
    expect(calls.some((c) => c.path.endsWith('/hide'))).toBe(true);
  });

  it('keeps a deleted listing read-only', () => {
    renderSubmit({ ...ready, status: 'ARCHIVED' }, {});
    expect(screen.getByRole('region', { name: en.listingStatus.ARCHIVED })).toBeVisible();
    expect(screen.queryByRole('button', { name: s.send })).toBeNull();
    expect(screen.getByText(en.builder.save.readonly)).toBeVisible();
  });
});
