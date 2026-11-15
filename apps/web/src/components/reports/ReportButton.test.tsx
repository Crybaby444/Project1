import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import deals from '../../../messages/deals/en.json';
import { apiError, fakeApi, meRoute, testUser } from '@/test/fake-api';
import { renderWithSession } from '@/test/render';
import { ReportButton } from './ReportButton';

vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/navigation')>()),
  usePathname: () => '/listings/l1',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

const t = deals.report;

describe('ReportButton', () => {
  it('asks for a reason in a dialog and sends the report', async () => {
    const api = fakeApi({ ...meRoute(testUser()), 'POST /api/v1/reports': { status: 201 } });
    renderWithSession(<ReportButton target="LISTING" id="l1" />, { client: api.client });
    await userEvent.click(await screen.findByRole('button', { name: t.listing }));
    const dialog = await screen.findByRole('dialog', { name: t.title });
    await userEvent.click(within(dialog).getByRole('radio', { name: t.reason.SCAM }));
    await userEvent.type(within(dialog).getByRole('textbox', { name: t.note }), 'Asks for Revolut');
    await userEvent.click(within(dialog).getByRole('button', { name: t.send }));
    await waitFor(() => expect(api.calls.find((c) => c.method === 'POST')?.body).toEqual({ target: 'LISTING', id: 'l1', reason: 'SCAM', note: 'Asks for Revolut' }));
    expect(await screen.findByText(t.sent)).toBeInTheDocument();
  });

  it('says so when it was already reported', async () => {
    const api = fakeApi({ ...meRoute(testUser()), 'POST /api/v1/reports': apiError(409, 'ACTION_NOT_ALLOWED', { details: { why: 'ALREADY_REPORTED' } }) });
    renderWithSession(<ReportButton target="USER" id="u1" />, { client: api.client });
    await userEvent.click(await screen.findByRole('button', { name: t.user }));
    const dialog = await screen.findByRole('dialog', { name: t.title });
    await userEvent.click(within(dialog).getByRole('radio', { name: t.reason.OFFENSIVE }));
    await userEvent.click(within(dialog).getByRole('button', { name: t.send }));
    expect(await screen.findByText(t.already)).toBeInTheDocument();
  });
});
