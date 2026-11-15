import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import en from '../../../messages/en.json';
import { fakeApi, meRoute } from '@/test/fake-api';
import { renderWithSession } from '@/test/render';
import { ShareButton } from './ShareButton';

const t = en.item.share;

afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, 'share');
});

describe('ShareButton', () => {
  it("opens the device's share sheet with the item's title and address where there is one", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    renderWithSession(<ShareButton title="Cordless drill" />, { client: fakeApi(meRoute(null)).client, hasSession: false });
    await userEvent.click(screen.getByRole('button', { name: t.label }));
    expect(share).toHaveBeenCalledWith({ title: 'Cordless drill', url: window.location.href });
  });

  it('copies the link and says so where there is no share sheet', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    renderWithSession(<ShareButton title="Cordless drill" />, { client: fakeApi(meRoute(null)).client, hasSession: false });
    await userEvent.click(screen.getByRole('button', { name: t.label }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(window.location.href));
    expect(await screen.findByText(t.copied)).toBeInTheDocument();
  });
});
