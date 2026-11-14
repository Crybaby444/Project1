import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AdminListing } from '@yoyo/shared';
import { describe, expect, it, vi } from 'vitest';
import en from '../../../messages/en.json';
import { apiError, fakeApi, meRoute, testUser, type FakeRoutes } from '@/test/fake-api';
import { categoriesRoute, ownerListing } from '@/test/listings';
import { renderWithSession } from '@/test/render';
import { ModerationQueue } from './ModerationQueue';
import { choose } from '@/test/select';

vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/navigation')>()),
  usePathname: () => '/admin/listings',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

const m = en.moderation;
const admin = testUser({ id: 'admin-1', role: 'ADMIN' });

function adminListing(overrides: Partial<AdminListing> = {}): AdminListing {
  return {
    ...ownerListing({
      status: 'PENDING_REVIEW',
      title: 'PlayStation 5',
      description: 'A PS5 with two controllers, ready for a weekend of games.',
      categoryId: 'cat-consoles',
      condition: 'GOOD',
      attributes: { model: 'ps5', vr: false },
      dailyCents: 1500,
      depositCents: 10000,
      city: 'Rīga',
      district: 'Centrs',
      lat: 56.949649,
      lng: 24.105186,
      rules: { preset: ['ID_AT_PICKUP'], custom: ['Return it charged'] },
      photos: [
        { id: 'p1', width: 800, height: 600, position: 0, urls: { thumb: '/t', card: '/c', full: '/f' } },
      ],
      submittedAt: '2026-11-04T09:00:00.000Z',
      version: 3,
    }),
    owner: { id: 'user-2', name: 'Jānis Ozols', email: 'janis@mail.lv' },
    ...overrides,
  };
}

function renderQueue(routes: FakeRoutes, items = [adminListing()], queue: 'review' | 'other' = 'review') {
  const { client, calls } = fakeApi({
    ...meRoute(admin),
    ...categoriesRoute,
    'GET /api/v1/admin/listings': { status: 200, body: { items, total: items.length } },
    ...routes,
  });
  renderWithSession(<ModerationQueue page={1} queue={queue} />, { client });
  return calls;
}

describe('ModerationQueue', () => {
  it('shows everything needed for a decision, but not the exact point', async () => {
    renderQueue({});
    const card = (await screen.findByRole('heading', { name: 'PlayStation 5' })).closest('article')!;
    expect(within(card).getByText('Electronics · Game consoles')).toBeVisible();
    expect(within(card).getByText('PlayStation 5', { selector: 'dd' })).toBeVisible(); // the model, by its label
    expect(within(card).getByText(en.listingRules.ID_AT_PICKUP)).toBeVisible();
    expect(within(card).getByText('Return it charged')).toBeVisible();
    expect(within(card).getByText('Rīga, Centrs')).toBeVisible();
    expect(within(card).getByText('Jānis Ozols')).toBeVisible();
    expect(card.innerHTML).not.toMatch(/56[.,]9|24[.,]1/);
  });

  it('approves the version it showed', async () => {
    const user = userEvent.setup();
    const calls = renderQueue({
      'POST /api/v1/admin/listings/listing-1/approve': {
        status: 200,
        body: { listing: adminListing({ status: 'PUBLISHED' }) },
      },
    });
    await user.click(await screen.findByRole('button', { name: m.approve }));
    await waitFor(() => expect(calls.find((c) => c.path.endsWith('/approve'))?.body).toEqual({ version: 3 }));
    expect(await screen.findByText(m.approved)).toBeVisible();
  });

  it('says so and reloads the queue when the owner changed the listing meanwhile', async () => {
    const user = userEvent.setup();
    const calls = renderQueue({
      'POST /api/v1/admin/listings/listing-1/approve': apiError(409, 'INVALID_STATUS', {
        details: { currentVersion: 4 },
      }),
    });
    await user.click(await screen.findByRole('button', { name: m.approve }));
    expect(await screen.findByText(m.changed)).toBeVisible();
    await waitFor(() => expect(calls.filter((c) => c.path === '/api/v1/admin/listings')).toHaveLength(2));
  });

  it('rejects with a reason of at least 10 characters, sent with the version', async () => {
    const user = userEvent.setup();
    const calls = renderQueue({
      'POST /api/v1/admin/listings/listing-1/reject': {
        status: 200,
        body: { listing: adminListing({ status: 'REJECTED' }) },
      },
    });
    await user.click(await screen.findByRole('button', { name: m.reject }));
    const dialog = screen.getByRole('dialog', { name: m.rejectTitle });
    await user.type(within(dialog).getByLabelText(m.reason), 'Blurry');
    await user.click(within(dialog).getByRole('button', { name: m.send }));
    expect(within(dialog).getByLabelText(m.reason)).toHaveAttribute('aria-invalid', 'true');
    expect(calls.some((c) => c.path.endsWith('/reject'))).toBe(false);

    await user.click(within(dialog).getByRole('button', { name: m.suggestion.photos }));
    await user.click(within(dialog).getByRole('button', { name: m.send }));
    await waitFor(() =>
      expect(calls.find((c) => c.path.endsWith('/reject'))?.body).toEqual({
        reason: `Blurry ${m.suggestion.photos}`,
        version: 3,
      }),
    );
  });

  it('has a friendly empty state', async () => {
    renderQueue({}, []);
    expect(await screen.findByRole('heading', { name: m.emptyTitle })).toBeVisible();
  });

  describe('the «Other» queue', () => {
    it('asks for the listings filed under «Other», and offers to move them instead of deciding published ones', async () => {
      const calls = renderQueue({}, [adminListing({ status: 'PUBLISHED' })], 'other');
      await screen.findByRole('heading', { name: 'PlayStation 5' });
      expect(calls.find((c) => c.path === '/api/v1/admin/listings')?.query).toBe('category=other&page=1');
      expect(screen.getByRole('link', { name: m.queueOther })).toHaveAttribute('aria-current', 'page');
      expect(screen.queryByRole('button', { name: m.approve })).toBeNull();
      expect(screen.getByRole('button', { name: m.move.button })).toBeVisible();
    });

    it('moves a listing to the chosen subcategory with the version it showed', async () => {
      const user = userEvent.setup();
      const calls = renderQueue(
        { 'POST /api/v1/admin/listings/listing-1/category': { status: 200, body: { listing: adminListing() } } },
        [adminListing({ status: 'PUBLISHED', categoryId: null })],
        'other',
      );
      await user.click(await screen.findByRole('button', { name: m.move.button }));
      const dialog = screen.getByRole('dialog');
      await user.click(within(dialog).getByRole('button', { name: m.move.submit }));
      expect(within(dialog).getByText(m.move.required)).toBeVisible();
      await choose(user, within(dialog).getByRole('combobox', { name: m.move.label }), 'Game consoles');
      await user.click(within(dialog).getByRole('button', { name: m.move.submit }));
      await waitFor(() =>
        expect(calls.find((c) => c.path.endsWith('/category'))?.body).toEqual({ categoryId: 'cat-consoles', version: 3 }),
      );
      expect(await screen.findByText('Moved to Electronics · Game consoles. The owner gets an email.')).toBeVisible();
    });
  });
});
