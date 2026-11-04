import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import en from '../../../messages/en.json';
import { fakeApi, meRoute, testUser } from '@/test/fake-api';
import { renderWithSession } from '@/test/render';
import { RequireRole } from './RequireRole';

vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/navigation')>()),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/admin/listings',
}));

function Secret() {
  return <p>queue</p>;
}

describe('RequireRole', () => {
  it('tells a user without the role there is no access, and mounts nothing behind it', async () => {
    const { client } = fakeApi(meRoute(testUser({ role: 'USER' })));
    renderWithSession(
      <RequireRole role="ADMIN">
        <Secret />
      </RequireRole>,
      { client },
    );
    expect(await screen.findByRole('heading', { level: 1, name: en.noAccess.title })).toBeVisible();
    expect(screen.queryByText('queue')).toBeNull();
    expect(screen.getByRole('link', { name: en.noAccess.back })).toHaveAttribute('href', '/');
  });

  it('shows the page to an administrator', async () => {
    const { client } = fakeApi(meRoute(testUser({ role: 'ADMIN' })));
    renderWithSession(
      <RequireRole role="ADMIN">
        <Secret />
      </RequireRole>,
      { client },
    );
    expect(await screen.findByText('queue')).toBeVisible();
  });
});
