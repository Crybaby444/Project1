import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import en from '../../../messages/en.json';
import { apiError, fakeApi, meRoute, testUser } from '@/test/fake-api';
import { renderWithSession } from '@/test/render';
import { TwoFactorSettings } from './TwoFactorSettings';

const t = en.twoFactor;

describe('TwoFactorSettings', () => {
  it('sets up with a QR code and the key, refuses a wrong code, turns on with the right one', async () => {
    const user = userEvent.setup();
    let on = false;
    const { client } = fakeApi({
      ...meRoute(testUser()),
      'GET /api/v1/me/two-factor': () => ({ status: 200, body: { enabled: on } }),
      'POST /api/v1/me/two-factor/setup': { status: 200, body: { secret: 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP', uri: 'otpauth://totp/Yoyo:a?secret=JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP&issuer=Yoyo' } },
      'POST /api/v1/me/two-factor/enable': (body) => {
        if ((body as { code: string }).code !== '654321') return apiError(401, 'AUTH_CODE_INVALID');
        on = true;
        return { status: 200, body: { enabled: true } };
      },
    });
    renderWithSession(<TwoFactorSettings hasPassword />, { client });

    await user.click(await screen.findByRole('button', { name: t.turnOn }));
    expect(await screen.findByRole('img', { name: t.qrLabel })).toBeInTheDocument();
    expect(screen.getByText('JBSW Y3DP EHPK 3PXP JBSW Y3DP EHPK 3PXP')).toBeInTheDocument();

    const code = screen.getByLabelText(t.codeToTurnOn);
    await user.type(code, '111111');
    await user.click(screen.getByRole('button', { name: t.confirm }));
    expect(await screen.findByText(en.errors.AUTH_CODE_INVALID)).toBeInTheDocument();

    await user.clear(code);
    await user.type(code, '654321');
    await user.click(screen.getByRole('button', { name: t.confirm }));
    await waitFor(() => expect(screen.getByText(t.on)).toBeInTheDocument());
  });

  it('tells a Google-only account to set a password first', () => {
    const { client } = fakeApi({ ...meRoute(testUser()) });
    renderWithSession(<TwoFactorSettings hasPassword={false} />, { client });
    expect(screen.getByText(t.needPassword)).toBeInTheDocument();
  });
});
