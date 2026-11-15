import { screen, within } from '@testing-library/react';
import type { AdminOverview as Overview } from '@yoyo/shared';
import { describe, expect, it, vi } from 'vitest';
import admin from '../../../../messages/admin/en.json';
import { fakeApi, meRoute, testUser } from '@/test/fake-api';
import { renderWithSession } from '@/test/render';
import { AdminOverview } from './AdminOverview';

vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/navigation')>()),
  usePathname: () => '/admin',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

const t = admin.admin.overview;

export function overview(over: Partial<Overview> = {}): Overview {
  return {
    users: { total: 120, new7d: 9, blocked: 1 },
    listings: { pendingReview: 3, published: 80, total: 95 },
    deals: { open: 12, requested: 2, disputed: 1, completed30d: 30 },
    money: { turnover30dCents: 1_234_500, revenueCents: 98_000, escrowCents: 40_000, depositsCents: 55_000, walletsCents: 12_000 },
    reports: { open: 0 },
    ledgerOk: true,
    series: Array.from({ length: 14 }, (_, i) => ({ day: `2026-11-${String(i + 1).padStart(2, '0')}`, users: i % 3, deals: i % 4 })),
    activity: [
      { kind: 'LISTING_SUBMITTED', at: '2026-11-14T10:00:00.000Z', id: 'l1', title: 'Tent for four', who: 'Olga' },
      { kind: 'DISPUTE_OPENED', at: '2026-11-14T09:00:00.000Z', id: 'b1', title: 'Drill', who: 'Olga' },
    ],
    ...over,
  };
}

describe('AdminOverview', () => {
  it('puts what waits first, each with its way in', async () => {
    const api = fakeApi({ ...meRoute(testUser({ role: 'ADMIN', name: 'Ada' })), 'GET /api/v1/admin/overview': { status: 200, body: overview() } });
    renderWithSession(<AdminOverview />, { client: api.client });
    const waiting = await screen.findByRole('region', { name: t.waiting });
    expect(within(waiting).getByRole('link', { name: /3 listings to review/ })).toHaveAttribute('href', '/admin/listings');
    expect(within(waiting).getByRole('link', { name: /1 dispute to decide/ })).toHaveAttribute('href', '/admin/deals?view=disputes');
    expect(screen.getByText(t.ledgerOk)).toBeInTheDocument();
  });

  it('says all clear when nothing waits, and links the activity', async () => {
    const api = fakeApi({
      ...meRoute(testUser({ role: 'ADMIN' })),
      'GET /api/v1/admin/overview': { status: 200, body: overview({ listings: { pendingReview: 0, published: 1, total: 1 }, deals: { open: 0, requested: 0, disputed: 0, completed30d: 0 } }) },
    });
    renderWithSession(<AdminOverview />, { client: api.client });
    expect(await screen.findByText(t.allClear)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Olga sent “Tent for four” for review' })).toHaveAttribute('href', '/admin/listings');
    expect(screen.getByRole('link', { name: 'Dispute opened on “Drill”' })).toHaveAttribute('href', '/admin/deals/b1');
  });

  it('warns when the ledger audit fails', async () => {
    const api = fakeApi({ ...meRoute(testUser({ role: 'ADMIN' })), 'GET /api/v1/admin/overview': { status: 200, body: overview({ ledgerOk: false }) } });
    renderWithSession(<AdminOverview />, { client: api.client });
    expect(await screen.findByRole('link', { name: new RegExp(t.ledgerBad) })).toHaveAttribute('href', '/admin/money');
  });
});
