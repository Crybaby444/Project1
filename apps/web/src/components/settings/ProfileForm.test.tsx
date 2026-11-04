import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import en from '../../../messages/en.json';
import { apiError, fakeApi, meRoute, testUser, type FakeRoutes } from '@/test/fake-api';
import { renderWithSession } from '@/test/render';
import { ProfileForm } from './ProfileForm';

const replace = vi.fn();
vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/navigation')>()),
  usePathname: () => '/settings',
  useRouter: () => ({ replace, push: vi.fn(), refresh: vi.fn() }),
}));

const anna = testUser({ name: 'Anna', city: 'Rīga', about: 'Tools.' });

function renderProfile(routes: FakeRoutes) {
  const { client, calls } = fakeApi({ ...meRoute(anna), ...routes });
  renderWithSession(<ProfileForm user={anna} />, { client });
  return calls;
}

const echo: FakeRoutes = {
  'PATCH /api/v1/me': (body) => ({ status: 200, body: { user: { ...anna, ...(body as object) } } }),
};

describe('ProfileForm', () => {
  beforeEach(() => replace.mockClear());

  it('starts from the profile and saves the changes', async () => {
    const user = userEvent.setup();
    const calls = renderProfile(echo);
    const name = screen.getByLabelText(en.settings.profile.name);
    expect(name).toHaveValue('Anna');
    expect(screen.getByLabelText(en.settings.profile.city)).toHaveValue('Rīga');

    await user.clear(name);
    await user.type(name, 'Anna Bērziņa');
    await user.click(screen.getByRole('button', { name: en.settings.profile.save }));

    expect(await screen.findByText(en.settings.profile.saved)).toBeVisible();
    expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({
      name: 'Anna Bērziņa',
      city: 'Rīga',
      about: 'Tools.',
      locale: 'en',
    });
    expect(replace).not.toHaveBeenCalled();
  });

  it('counts the characters of "about" up to 500', async () => {
    const user = userEvent.setup();
    renderProfile(echo);
    const about = screen.getByLabelText(en.settings.profile.about);
    expect(screen.getByText('6 / 500')).toBeInTheDocument();
    await user.type(about, ' More');
    expect(screen.getByText('11 / 500')).toBeInTheDocument();
    expect(about).toHaveAttribute('maxLength', '500');
  });

  it('switches the page to the language chosen for the account', async () => {
    const user = userEvent.setup();
    const calls = renderProfile(echo);

    await user.selectOptions(screen.getByLabelText(en.settings.profile.language), 'lv');
    await user.click(screen.getByRole('button', { name: en.settings.profile.save }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/settings', { locale: 'lv' }));
    expect(calls.find((c) => c.method === 'PATCH')?.body).toMatchObject({ locale: 'lv' });
  });

  it('shows the server’s field errors at the fields', async () => {
    const user = userEvent.setup();
    renderProfile({
      'PATCH /api/v1/me': apiError(400, 'VALIDATION_FAILED', { fields: { city: 'Too long' } }),
    });
    await user.click(screen.getByRole('button', { name: en.settings.profile.save }));

    const city = screen.getByLabelText(en.settings.profile.city);
    await waitFor(() => expect(city).toHaveAttribute('aria-invalid', 'true'));
    expect(city).toHaveFocus();
  });
});
