import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ActivityPage } from '@yoyo/shared';
import { describe, expect, it, vi } from 'vitest';
import admin from '../../../../messages/admin/en.json';
import { fakeApi, meRoute, testUser } from '@/test/fake-api';
import { renderWithSession } from '@/test/render';

const replace = vi.fn();
vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/navigation')>()),
  usePathname: () => '/admin/activity',
  useRouter: () => ({ replace, push: vi.fn(), refresh: vi.fn() }),
}));
const { AdminActivity } = await import('./AdminActivity');

const a = admin.admin.activity;
const page: ActivityPage = {
  items: [
    {
      id: 'e2',
      kind: 'LISTING_CREATED',
      actor: { id: 'u1', name: 'Anna Owner', username: 'anna.o' },
      targetType: 'LISTING',
      targetId: 'l1',
      summary: 'Bosch drill',
      at: '2026-11-16T10:00:00.000Z',
    },
    {
      id: 'e1',
      kind: 'MESSAGE_SENT',
      actor: { id: 'u2', name: 'Rita', username: null },
      targetType: 'CONVERSATION',
      targetId: 'c1',
      summary: '',
      at: '2026-11-16T09:00:00.000Z',
    },
  ],
  next: null,
};

describe('AdminActivity (owner, 2026-11-16)', () => {
  it('lists what people did, links the item, and filters by group and by person', async () => {
    const { client } = fakeApi({
      ...meRoute(testUser({ role: 'ADMIN', staffRole: 'OWNER' })),
      'GET /api/v1/admin/activity': { status: 200, body: page },
    });
    renderWithSession(<AdminActivity />, { client });
    expect(await screen.findByText(a.kinds.LISTING_CREATED)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Bosch drill' })).toHaveAttribute('href', '/listings/l1');
    expect(screen.getByText(a.kinds.MESSAGE_SENT)).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: a.groups.listings }));
    expect(replace).toHaveBeenLastCalledWith('/admin/activity?group=listings');
    await user.click(screen.getByRole('button', { name: '@anna.o' }));
    expect(replace).toHaveBeenLastCalledWith('/admin/activity?user=u1');
  });
});
