import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import en from '../../../messages/en.json';
import { renderWithIntl } from '@/test/render';
import { CONSENT_COOKIE } from '@/lib/analytics/consent';
import { ConsentBanner } from './ConsentBanner';

const clear = () => (document.cookie = `${CONSENT_COOKIE}=; path=/; max-age=0`);

describe('ConsentBanner', () => {
  afterEach(() => {
    clear();
    vi.unstubAllGlobals();
  });

  it('is not there while analytics is off (no measurement id)', () => {
    renderWithIntl(<ConsentBanner gaId="" />);
    expect(screen.queryByRole('region', { name: en.consent.label })).toBeNull();
  });

  it('asks once; accepting turns measurement on and remembers it', async () => {
    const user = userEvent.setup();
    const gtag = vi.fn();
    vi.stubGlobal('gtag', gtag);
    renderWithIntl(<ConsentBanner gaId="G-TEST123" />);
    await user.click(await screen.findByRole('button', { name: en.consent.accept }));
    expect(gtag).toHaveBeenCalledWith('consent', 'update', expect.objectContaining({ analytics_storage: 'granted' }));
    expect(document.cookie).toContain(`${CONSENT_COOKIE}=granted`);
    expect(screen.queryByRole('region', { name: en.consent.label })).toBeNull();
  });

  it('declining is as easy, and measures nothing', async () => {
    const user = userEvent.setup();
    const gtag = vi.fn();
    vi.stubGlobal('gtag', gtag);
    renderWithIntl(<ConsentBanner gaId="G-TEST123" />);
    await user.click(await screen.findByRole('button', { name: en.consent.decline }));
    expect(gtag).not.toHaveBeenCalledWith('consent', 'update', expect.objectContaining({ analytics_storage: 'granted' }));
    expect(document.cookie).toContain(`${CONSENT_COOKIE}=denied`);
  });

  it('does not ask again once answered', () => {
    document.cookie = `${CONSENT_COOKIE}=denied; path=/`;
    renderWithIntl(<ConsentBanner gaId="G-TEST123" />);
    expect(screen.queryByRole('region', { name: en.consent.label })).toBeNull();
  });
});
