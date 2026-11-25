import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import en from '../../../../messages/admin/en.json';
import { fakeApi, meRoute, testUser } from '@/test/fake-api';
import { renderWithSession } from '@/test/render';
import { AdminSettings } from './AdminSettings';

vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/navigation')>()),
  usePathname: () => '/admin/settings',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

const s = en.admin.settings;
const item = (key: string, value: number | string, def = value) => ({ key, value, default: def, changed: value !== def });

function renderSettings() {
  const api = fakeApi({
    ...meRoute(testUser({ role: 'ADMIN' })),
    'GET /api/v1/admin/settings': {
      status: 200,
      body: {
        items: [
          item('fees.servicePercent', 10),
          item('fees.promoServicePercent', 0),
          item('fees.promoServiceUntil', ''),
          item('booking.requestTtlHours', 24),
          item('booking.paymentTtlHours', 24),
          item('booking.handoverConfirmHours', 48),
          item('booking.returnConfirmHours', 48),
          item('booking.inspectionHours', 48),
          item('booking.damageReplyHours', 48),
          item('booking.maxAdvanceDays', 365),
          item('review.windowDays', 14),
        ],
      },
    },
  });
  renderWithSession(<AdminSettings />, { client: api.client });
  return api;
}

describe('AdminSettings', () => {
  it('reads values out, steps within the range and lists the change before saving', async () => {
    const user = userEvent.setup();
    renderSettings();
    const fee = await screen.findByLabelText(s.key.fees.servicePercent);
    expect(screen.getAllByText('= 1 day').length).toBeGreaterThan(0);
    expect(screen.getByText(s.promo.none.replace('{fee}', '10'))).toBeVisible();
    const row = fee.closest('div.grid') as HTMLElement;
    await user.click(within(row).getByRole('button', { name: s.more }));
    expect(fee).toHaveValue(11);
    expect(screen.getByRole('button', { name: s.saveCount.replace('{count}', '1') })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: s.discard }));
    expect(fee).toHaveValue(10);
  });

  it('stops a value outside the range before it is sent', async () => {
    const user = userEvent.setup();
    renderSettings();
    const hours = await screen.findByLabelText(s.key.booking.requestTtlHours);
    await user.clear(hours);
    await user.type(hours, '999');
    expect(hours).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText(s.invalid)).toBeVisible();
    expect(screen.getByRole('button', { name: s.saveCount.replace('{count}', '1') })).toBeDisabled();
  });
});
