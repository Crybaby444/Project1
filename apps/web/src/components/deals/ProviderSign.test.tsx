import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { testBooking } from '@/test/deals';
import '@/test/dialog';
import { fakeApi, meRoute, testUser } from '@/test/fake-api';
import { renderWithSession } from '@/test/render';
import { ProviderSign } from './ProviderSign';

const booking = testBooking({ status: 'ACCEPTED', hasContract: true, actions: ['SIGN', 'CANCEL'], version: 2 });

describe('signing through the provider', () => {
  it('shows the provider’s page and closes once the provider confirms the signature', async () => {
    let state = 'PENDING';
    const api = fakeApi({
      ...meRoute(testUser()),
      [`POST /api/v1/bookings/${booking.id}/signing`]: { status: 200, body: { url: 'https://gateway-sandbox.dokobit.com/signing/abc?access_token=s1' } },
      [`GET /api/v1/bookings/${booking.id}/signing`]: () => ({ status: 200, body: { state } }),
    });
    const onClose = vi.fn();
    renderWithSession(<ProviderSign booking={booking} onClose={onClose} />, { client: api.client });
    const frame = await screen.findByTitle('Signing page');
    expect(frame.getAttribute('src')).toBe('https://gateway-sandbox.dokobit.com/signing/abc?access_token=s1');
    await waitFor(() => expect(api.calls.some((c) => c.method === 'GET' && c.path.endsWith('/signing'))).toBe(true), { timeout: 5000 });
    expect(onClose).not.toHaveBeenCalled();
    state = 'SIGNED';
    await waitFor(() => expect(onClose).toHaveBeenCalled(), { timeout: 8000 });
  }, 15_000);

  it('offers to start again when the provider says the signing failed', async () => {
    const api = fakeApi({
      ...meRoute(testUser()),
      [`POST /api/v1/bookings/${booking.id}/signing`]: { status: 200, body: { url: 'https://gateway-sandbox.dokobit.com/signing/abc?access_token=s1' } },
      [`GET /api/v1/bookings/${booking.id}/signing`]: { status: 200, body: { state: 'FAILED' } },
    });
    renderWithSession(<ProviderSign booking={booking} onClose={() => {}} />, { client: api.client });
    expect(await screen.findByRole('button', { name: 'Start signing again' }, { timeout: 6000 })).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toContain('The signing was not completed');
  }, 15_000);
});
