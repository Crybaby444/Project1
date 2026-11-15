import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import admin from '../../../../messages/admin/en.json';
import { fakeApi, meRoute, testUser } from '@/test/fake-api';
import { renderWithSession } from '@/test/render';
import { AdminShell } from './AdminShell';

let path = '/admin';
vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/navigation')>()),
  usePathname: () => path,
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

const t = admin.admin;

function shell(staffRole: 'OWNER' | 'EDITOR' | null, at: string) {
  path = at;
  const api = fakeApi({ ...meRoute(testUser({ role: 'ADMIN', staffRole })), 'GET /api/v1/admin/overview': { status: 500, body: {} } });
  renderWithSession(
    <AdminShell>
      <p>page body</p>
    </AdminShell>,
    { client: api.client },
  );
}

describe('AdminShell and staff roles', () => {
  it('shows an editor only their sections', async () => {
    shell('EDITOR', '/admin/seo');
    const nav = await screen.findByRole('navigation', { name: t.navLabel });
    expect(await within(nav).findByRole('link', { name: t.nav.seo })).toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: t.nav.money })).toBeNull();
    expect(within(nav).queryByRole('link', { name: t.nav.staff })).toBeNull();
    expect(screen.getByText('page body')).toBeInTheDocument();
  });

  it('says "not your part" instead of a section the role does not open', async () => {
    shell('EDITOR', '/admin/money');
    expect(await screen.findByRole('heading', { name: t.noAccess.title })).toBeInTheDocument();
    expect(screen.queryByText('page body')).toBeNull();
  });

  it('an administrator without a staff role is the owner and sees everything', async () => {
    shell(null, '/admin/staff');
    const nav = await screen.findByRole('navigation', { name: t.navLabel });
    expect(await within(nav).findByRole('link', { name: t.nav.staff })).toBeInTheDocument();
    expect(screen.getByText('page body')).toBeInTheDocument();
  });
});
