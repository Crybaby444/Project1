import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import en from '../../../messages/en.json';
import { fakeApi, meRoute, testUser } from '@/test/fake-api';
import { renderWithSession } from '@/test/render';
import { FirstSteps } from './FirstSteps';

const routes = {
  'GET /api/v1/me/listings': { status: 200, body: { items: [] } },
  'GET /api/v1/me/bookings/summary': { status: 200, body: { renter: { open: 0, needsAction: 0 }, owner: { open: 0, needsAction: 0 } } },
};

describe('FirstSteps', () => {
  it('shows a new account where it is: the account counts, what is left links to its place', async () => {
    const user = testUser({ emailVerified: true, identityVerified: false, about: null, city: null, createdAt: new Date().toISOString() });
    const api = fakeApi({ ...meRoute(user), ...routes });
    renderWithSession(<FirstSteps />, { client: api.client });
    expect(await screen.findByRole('heading', { name: en.firstSteps.title })).toBeVisible();
    expect(screen.getByText('2 / 5')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: new RegExp(en.firstSteps.steps.identity.title) })).toHaveAttribute('href', '/verify-identity');
    expect(screen.getByText(en.firstSteps.welcome)).toBeVisible();
  });

  it('is gone after the first month', async () => {
    const user = testUser({ emailVerified: false, createdAt: new Date(Date.now() - 40 * 24 * 3600 * 1000).toISOString() });
    const api = fakeApi({ ...meRoute(user), ...routes });
    const { container } = renderWithSession(<FirstSteps />, { client: api.client });
    await new Promise((r) => setTimeout(r, 50));
    expect(container.querySelector('[data-first-steps]')).toBeNull();
  });
});
