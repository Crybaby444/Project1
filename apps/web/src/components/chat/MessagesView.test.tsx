import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ChatMessage, ConversationSummary } from '@yoyo/shared';
import { describe, expect, it, vi } from 'vitest';
import deals from '../../../messages/deals/en.json';
import { fakeApi, meRoute, testUser } from '@/test/fake-api';
import { renderWithSession } from '@/test/render';
import { MessagesView } from './MessagesView';

vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/navigation')>()),
  usePathname: () => '/messages',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

const t = deals.chat;
const NOW = '2026-11-14T10:00:00.000Z';

const line = (over: Partial<ChatMessage> = {}): ChatMessage => ({
  id: 'm1', kind: 'TEXT', text: 'Is it free on Saturday?', event: null, bookingId: null, mine: false, createdAt: NOW, ...over,
});

const summary = (over: Partial<ConversationSummary> = {}): ConversationSummary => ({
  id: 'c1',
  role: 'OWNER',
  listing: { id: 'l1', title: 'Cordless drill', photoUrl: null },
  other: { id: 'u2', name: 'Rita Renter' },
  lastMessage: line(),
  lastMessageAt: NOW,
  unread: 1,
  ...over,
});

describe('MessagesView', () => {
  it('lists conversations with the other side, the item and the unread count', async () => {
    const api = fakeApi({ ...meRoute(testUser()), 'GET /api/v1/me/conversations': { status: 200, body: { items: [summary()] } } });
    renderWithSession(<MessagesView />, { client: api.client });
    const list = await screen.findByRole('list', { name: t.listLabel });
    const item = within(list).getByRole('link', { name: /Rita Renter/ });
    expect(item).toHaveAttribute('href', '/messages/c1');
    expect(item).toHaveTextContent('Cordless drill');
    expect(item).toHaveTextContent('Is it free on Saturday?');
    expect(within(item).getByText('1 unread')).toBeInTheDocument();
  });

  it('invites to the catalog when there are none', async () => {
    const api = fakeApi({ ...meRoute(testUser()), 'GET /api/v1/me/conversations': { status: 200, body: { items: [] } } });
    renderWithSession(<MessagesView />, { client: api.client });
    expect(await screen.findByText(t.emptyTitle)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t.browse })).toHaveAttribute('href', '/c');
  });

  it('shows a thread with deal steps in words, marks it read and sends plain text', async () => {
    const thread = {
      ...summary(),
      messages: [
        line({ id: 's1', kind: 'SYSTEM', text: '', event: 'REQUESTED', bookingId: 'b1' }),
        line({ id: 'm1', text: '<b>hi</b>' }),
        line({ id: 'm2', text: 'Sure, from 10.', mine: true }),
      ],
      otherReadAt: NOW,
      dealId: 'b1',
    };
    const api = fakeApi({
      ...meRoute(testUser()),
      'GET /api/v1/me/conversations': { status: 200, body: { items: [summary()] } },
      'GET /api/v1/conversations/c1': { status: 200, body: thread },
      'POST /api/v1/conversations/c1/read': { status: 204 },
      'POST /api/v1/conversations/c1/messages': (body) => ({ status: 201, body: { message: line({ id: 'm3', text: (body as { text: string }).text, mine: true }) } }),
      'GET /api/v1/me/conversations/unread': { status: 200, body: { count: 0 } },
    });
    renderWithSession(<MessagesView activeId="c1" />, { client: api.client });
    const log = await screen.findByRole('log');
    expect(within(log).getByText(t.system.REQUESTED)).toBeInTheDocument();
    expect(within(log).getByText('<b>hi</b>')).toBeInTheDocument(); // text, never HTML
    expect(within(log).getByText(t.seen)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t.openDeal })).toHaveAttribute('href', '/bookings/b1');
    await waitFor(() => expect(api.calls.some((c) => c.method === 'POST' && c.path.endsWith('/read'))).toBe(true));

    await userEvent.type(screen.getByRole('textbox', { name: t.placeholder }), 'See you then');
    await userEvent.click(screen.getByRole('button', { name: t.send }));
    await waitFor(() => expect(api.calls.find((c) => c.path.endsWith('/messages'))?.body).toEqual({ text: 'See you then' }));
    expect(screen.getByRole('textbox', { name: t.placeholder })).toHaveValue('');
  });
});
