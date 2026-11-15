import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import deals from '../../../messages/deals/en.json';
import { fakeApi, meRoute, testUser } from '@/test/fake-api';
import { renderWithSession } from '@/test/render';
import { EmailSettings } from './EmailSettings';

const t = deals.notifications.email;

describe('EmailSettings', () => {
  it('shows each topic as a switch, on unless turned off, and saves a change at once', async () => {
    const api = fakeApi({
      ...meRoute(testUser()),
      'GET /api/v1/me/email-preferences': { status: 200, body: { off: ['OFFERS'] } },
      'PUT /api/v1/me/email-preferences': (body) => ({ status: 200, body }),
    });
    renderWithSession(<EmailSettings />, { client: api.client });
    const deals_ = await screen.findByRole('switch', { name: new RegExp(t.DEALS) });
    expect(deals_).toBeChecked();
    expect(screen.getByRole('switch', { name: new RegExp(t.OFFERS) })).not.toBeChecked();
    await userEvent.click(deals_);
    await waitFor(() => expect(api.calls.find((c) => c.method === 'PUT')?.body).toEqual({ off: ['OFFERS', 'DEALS'] }));
    expect(await screen.findByText(t.saved)).toBeInTheDocument();
  });
});
