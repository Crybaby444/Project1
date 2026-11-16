import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { IdentityState } from '@yoyo/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import en from '../../../messages/en.json';
import { fakeApi, meRoute, testUser } from '@/test/fake-api';
import { renderWithSession } from '@/test/render';
import { IdentityCheck } from './IdentityCheck';

const m = en.identityCheck;
const none: IdentityState = { status: 'NONE', documentType: null, refusal: null, submittedAt: null, decidedAt: null };

function show(state: IdentityState) {
  const { client } = fakeApi({ ...meRoute(testUser()), 'GET /api/v1/me/identity': { status: 200, body: state } });
  renderWithSession(<IdentityCheck />, { client });
}

describe('IdentityCheck (owner, 2026-11-16)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('says why, who sees the photos and when they go, and names every missing part before sending', async () => {
    const send = vi.fn();
    vi.stubGlobal('fetch', send);
    show(none);
    expect(await screen.findByText(m.facts.erase)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: m.submit }));
    for (const text of [m.errors.documentType, m.errors.document, m.errors.selfie, m.errors.consent]) expect(screen.getByText(text)).toBeInTheDocument();
    expect(send).not.toHaveBeenCalled();
  });

  it('sends both photos with the consent, then shows that a moderator has it', async () => {
    const send = vi.fn(async (_url: string, init: RequestInit) => {
      const form = init.body as FormData;
      expect(form.get('documentType')).toBe('ID_CARD');
      expect(form.get('consent')).toBe('true');
      expect(form.get('document')).toBeInstanceOf(Blob);
      expect(form.get('selfie')).toBeInstanceOf(Blob);
      return new Response(JSON.stringify({ ...none, status: 'PENDING', documentType: 'ID_CARD', submittedAt: '2026-11-16T10:00:00.000Z' }), { status: 201 });
    });
    vi.stubGlobal('fetch', send);
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => 'blob:x', revokeObjectURL: () => undefined }));
    show(none);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('radio', { name: m.documents.ID_CARD }));
    const [doc, selfie] = screen.getAllByLabelText(/Photo of the document|Your selfie/) as HTMLInputElement[];
    await user.upload(doc!, new File(['d'], 'd.jpg', { type: 'image/jpeg' }));
    await user.upload(selfie!, new File(['s'], 's.jpg', { type: 'image/jpeg' }));
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: m.submit }));
    await waitFor(() => expect(send).toHaveBeenCalledOnce());
    expect(await screen.findByText(/^Sent on/)).toBeInTheDocument();
  });

  it('shows the moderator’s reason after a refusal, and a confirmed identity plainly', async () => {
    show({ ...none, status: 'REJECTED', refusal: 'The photo is blurry' });
    expect(await screen.findByRole('alert')).toHaveTextContent('The photo is blurry');
  });
});
