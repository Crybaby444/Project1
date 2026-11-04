import { expect, test } from '@playwright/test';
import en from '../messages/en.json' with { type: 'json' };
import lv from '../messages/lv.json' with { type: 'json' };
import { asOwnVisitor, formError, registerByApi, signInWithForm } from './support/accounts';

const s = en.settings.security;

test.beforeEach(async ({ context }) => {
  await asOwnVisitor(context);
});

test('a visitor is sent to sign in first and comes back to the settings', async ({ page }) => {
  await page.goto('/settings');
  await expect(page).toHaveURL(/\/login\?next=%2Fsettings$/);
});

test.describe('profile', () => {
  test('a new name shows in the user menu', async ({ page }) => {
    await registerByApi(page.request, { name: 'Anna' });
    await page.goto('/settings');

    await page.getByLabel(en.settings.profile.name).fill('Jānis Ozols');
    await page.getByRole('button', { name: en.settings.profile.save }).click();
    await expect(page.getByRole('status').filter({ hasText: en.settings.profile.saved })).toBeVisible();

    await expect(page.getByRole('button', { name: en.header.account })).toHaveText('JO');
    await page.getByRole('button', { name: en.header.account }).click();
    await expect(page.getByRole('menu').locator('..').getByText('Jānis Ozols')).toBeVisible();
    await page.reload();
    await expect(page.getByLabel(en.settings.profile.name)).toHaveValue('Jānis Ozols');
  });

  test('choosing Latvian moves the page to /lv/settings, in Latvian', async ({ page }) => {
    await registerByApi(page.request);
    await page.goto('/settings');

    await page.getByRole('combobox', { name: en.settings.profile.language }).selectOption('lv');
    await page.getByRole('button', { name: en.settings.profile.save }).click();

    await expect(page).toHaveURL(/\/lv\/settings$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'lv');
    await expect(page.getByRole('heading', { level: 1, name: lv.settings.title })).toBeVisible();
    expect((await (await page.request.get('/api/v1/me')).json()).user.locale).toBe('lv');
  });
});

test.describe('security', () => {
  test('after a password change the old password no longer signs in', async ({ page, context }) => {
    const { email, password } = await registerByApi(page.request);
    const next = 'another long passphrase';
    await page.goto('/settings/security');

    await page.getByLabel(en.auth.fields.currentPassword).fill(password);
    await page.getByLabel(en.auth.fields.newPassword, { exact: true }).fill(next);
    await page.getByLabel(en.auth.fields.repeatPassword).fill(next);
    await page.getByRole('button', { name: s.password.submit }).click();
    await expect(page.getByRole('status').filter({ hasText: s.password.changed })).toBeVisible();
    expect((await page.request.get('/api/v1/me')).status()).toBe(200); // this device stays signed in

    await context.clearCookies();
    await page.goto('/login');
    await signInWithForm(page, email, password, en.auth.login.submit);
    await expect(formError(page)).toHaveText(en.errors.AUTH_INVALID_CREDENTIALS);
  });

  test('signing out everywhere ends the session of another browser at once', async ({ page, browser }) => {
    const { email, password } = await registerByApi(page.request);
    const other = await browser.newContext({ baseURL: test.info().project.use.baseURL });
    await asOwnVisitor(other);
    expect((await other.request.post('/api/v1/auth/login', { data: { email, password } })).status()).toBe(
      200,
    );
    expect((await other.request.get('/api/v1/me')).status()).toBe(200);

    await page.goto('/settings/security');
    await page.getByRole('button', { name: s.logoutAll.open }).click();
    await page
      .getByRole('dialog', { name: s.logoutAll.title })
      .getByRole('button', { name: s.logoutAll.submit })
      .click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('link', { name: en.header.signIn })).toBeVisible();
    expect((await other.request.get('/api/v1/me')).status()).toBe(401);
    await other.close();
  });

  test('a deleted account cannot sign in again', async ({ page, context }) => {
    const { email, password } = await registerByApi(page.request);
    await page.goto('/settings/security');

    await page.getByRole('button', { name: s.delete.open }).click();
    const dialog = page.getByRole('dialog', { name: s.delete.title });
    await dialog.getByLabel(s.delete.confirmLabel.replace('{word}', s.delete.word)).fill(s.delete.word);
    await dialog.getByLabel(s.delete.passwordLabel).fill(password);
    await dialog.getByRole('button', { name: s.delete.submit }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('status').filter({ hasText: s.delete.done })).toBeVisible();

    await context.clearCookies();
    await page.goto('/login');
    await signInWithForm(page, email, password, en.auth.login.submit);
    await expect(formError(page)).toHaveText(en.errors.AUTH_INVALID_CREDENTIALS);
  });
});
