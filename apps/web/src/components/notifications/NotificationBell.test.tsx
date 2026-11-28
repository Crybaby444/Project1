import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Notification } from '@yoyo/shared';
import { describe, expect, it, vi } from 'vitest';
import deals from '../../../messages/deals/en.json';
import { fakeApi, meRoute, testUser } from '@/test/fake-api';
import { renderWithSession } from '@/test/render';
import { NotificationBell } from './NotificationBell';

vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/navigation')>()),
  usePathname: () => '/',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

const t = deals.notifications;
const note = (over: Partial<Notification>): Notification => ({
  id: 'n1', kind: 'DEAL', event: 'REQUESTED', bookingId: 'b1', listingId: 'l1', title: 'Cordless drill', createdAt: '2026-11-15T10:00:00.000Z', readAt: null, ...over,
});

describe('NotificationBell', () => {
  it('shows the unread count, opens the newest in words with links, and marks all read', async () => {
    const api = fakeApi({
      ...meRoute(testUser()),
      'GET /api/v1/me/badges': { status: 200, body: { messages: 0, notifications: 2, deals: { renter: { open: 0, needsAction: 0 }, owner: { open: 0, needsAction: 0 } } } },
      'GET /api/v1/me/notifications': {
        status: 200,
        body: { unread: 2, items: [note({}), note({ id: 'n2', kind: 'LISTING', event: 'APPROVED', bookingId: null, title: 'Tent' }), note({ id: 'n3', kind: 'DEAL', event: 'SOMETHING_NEW', readAt: '2026-11-15T11:00:00.000Z' })] },
      },
      'POST /api/v1/me/notifications/read': { status: 204 },
    });
    renderWithSession(<NotificationBell />, { client: api.client });
    const button = await screen.findByRole('button', { name: `${t.bell}, 2 unread` });
    // The list is not asked for until the panel opens: the count comes with the header's other counts.
    expect(api.calls.some((c) => c.method === 'GET' && c.path === '/api/v1/me/notifications')).toBe(false);
    await userEvent.click(button);
    const panel = screen.getByRole('region', { name: t.title });
    expect(within(panel).getByRole('link', { name: /Booking request: “Cordless drill”/ })).toHaveAttribute('href', '/bookings/b1');
    expect(within(panel).getByRole('link', { name: /“Tent” is published/ })).toHaveAttribute('href', '/listings/l1');
    expect(within(panel).getByText('“Cordless drill”: something changed')).toBeInTheDocument();
    await userEvent.click(within(panel).getByRole('button', { name: t.markAll }));
    await waitFor(() => expect(api.calls.some((c) => c.method === 'POST' && c.path === '/api/v1/me/notifications/read')).toBe(true));
    expect(within(panel).getByRole('link', { name: t.seeAll })).toHaveAttribute('href', '/notifications');
  });
});
