import { screen, waitFor } from '@testing-library/react';
import type { IdentityState, PublicUser } from '@yoyo/shared';
import { describe, expect, it } from 'vitest';
import en from '../../../messages/en.json';
import { fakeApi, meRoute, testUser } from '@/test/fake-api';
import { renderWithSession } from '@/test/render';
import { IdentityNotice, useDealReadiness } from './IdentityNotice';

const m = en.identityCheck.notice;
const none: IdentityState = { status: 'NONE', documentType: null, refusal: null, submittedAt: null, decidedAt: null };

function Probe({ action }: { action: 'lend' | 'rent' }) {
  const readiness = useDealReadiness();
  return (
    <>
      <span data-testid="readiness">{readiness}</span>
      <IdentityNotice action={action} readiness={readiness} />
    </>
  );
}

function show(user: PublicUser, { required = true, check = none }: { required?: boolean; check?: IdentityState } = {}, action: 'lend' | 'rent' = 'rent') {
  const { client } = fakeApi({
    ...meRoute(user),
    'GET /api/v1/auth/providers': { status: 200, body: { google: false, apple: false, phone: false, identityRequired: required } },
    'GET /api/v1/me/identity': { status: 200, body: check },
  });
  renderWithSession(<Probe action={action} />, { client });
}

describe('IdentityNotice (owner, 2026-11-16)', () => {
  it('asks for the two ticks first, in the profile', async () => {
    show(testUser({ adultConfirmed: false, identityVerified: false }));
    expect(await screen.findByText(m.profile.rent)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: m.profile.button })).toHaveAttribute('href', '/settings');
  });

  it('then the identity check, coming back to the same page', async () => {
    show(testUser({ identityVerified: false }), {}, 'lend');
    expect(await screen.findByText(m.identity.lend)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: m.identity.button }).getAttribute('href')).toMatch(/^\/verify-identity\?next=/);
  });

  it('says a check is with a moderator, without a button', async () => {
    show(testUser({ identityVerified: false }), { check: { ...none, status: 'PENDING', submittedAt: '2026-11-16T10:00:00.000Z' } });
    expect(await screen.findByText(m.pending.rent)).toBeInTheDocument();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('stays out of the way for a confirmed person, or where the check is off', async () => {
    show(testUser({ identityVerified: false }), { required: false });
    await waitFor(() => expect(screen.getByTestId('readiness')).toHaveTextContent('ready'));
    expect(document.querySelector('[data-identity-notice]')).toBeNull();
  });
});
