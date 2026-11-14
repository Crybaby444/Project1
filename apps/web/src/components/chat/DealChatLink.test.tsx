import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import deals from '../../../messages/deals/en.json';
import { fakeApi, meRoute, testUser } from '@/test/fake-api';
import { renderWithSession } from '@/test/render';
import { DealChatLink } from './DealChatLink';

vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/navigation')>()),
  usePathname: () => '/bookings/b1',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

const conversation = {
  id: 'c9',
  role: 'OWNER',
  listing: { id: 'l1', title: 'Drill', photoUrl: null },
  other: { id: 'u2', name: 'Rita' },
  lastMessage: null,
  lastMessageAt: '2026-11-14T10:00:00.000Z',
  unread: 0,
};

describe('DealChatLink', () => {
  it("leads the owner to the deal's conversation", async () => {
    const api = fakeApi({ ...meRoute(testUser()), 'GET /api/v1/me/conversations': { status: 200, body: { items: [conversation] } } });
    renderWithSession(<DealChatLink listingId="l1" otherId="u2" role="OWNER" />, { client: api.client });
    expect(await screen.findByRole('link', { name: deals.chat.messageRenter })).toHaveAttribute('href', '/messages/c9');
  });

  it('lets the renter start one when there is none yet', async () => {
    const api = fakeApi({ ...meRoute(testUser()), 'GET /api/v1/me/conversations': { status: 200, body: { items: [] } } });
    renderWithSession(<DealChatLink listingId="l1" otherId="u2" role="RENTER" />, { client: api.client });
    expect(await screen.findByRole('button', { name: deals.chat.messageOwner })).toBeInTheDocument();
  });
});
