import { expect, test } from '@playwright/test';
import en from '../messages/en.json' with { type: 'json' };
import {
  asOwnVisitor,
  formError,
  PASSWORD,
  registerByApi,
  signInWithForm,
  uniqueEmail,
} from './support/accounts';

test.beforeEach(async ({ context }) => {
  await asOwnVisitor(context);
});

test.describe('sign-up', () => {
  test('creates the account, goes on to next and shows the confirmation banner', async ({ page }) => {
    const email = uniqueEmail();
    await page.goto('/register?next=/styleguide');

    await page.getByLabel(en.auth.fields.name).fill('Anna Bērziņa');
    await page.getByLabel(en.auth.fields.email).fill(email);
    await page.getByLabel(en.auth.fields.password, { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: en.auth.register.submit }).click();

    await expect(page).toHaveURL(/\/styleguide$/);
    await expect(page.getByText(en.banner.verifyEmail.title)).toBeVisible();
    await expect(page.getByRole('button', { name: en.header.account })).toHaveText('AB');
  });
});

test.describe('sign-in', () => {
  for (const next of ['//evil.example', 'https://evil.example', '/\\evil.example']) {
    test(`never follows next=${next} off the site (Review Focus 2)`, async ({ page, context, baseURL }) => {
      const { email, password } = await registerByApi(page.request);
      await context.clearCookies();

      await page.goto(`/login?next=${encodeURIComponent(next)}`);
      await signInWithForm(page, email, password, en.auth.login.submit);

      await expect(page).toHaveURL(`${baseURL}/`);
      await expect(page.getByRole('button', { name: en.header.account })).toBeVisible();
    });
  }

  test('comes back to a page on the site, and the header shows the account', async ({ page, context }) => {
    const { email, password } = await registerByApi(page.request);
    await context.clearCookies();

    await page.goto('/lv/login?next=%2Fstyleguide');
    await signInWithForm(page, email, password, 'Pieteikties');

    await expect(page).toHaveURL(/\/lv\/styleguide$/);
    await expect(page.getByRole('button', { name: 'Konta izvēlne' })).toBeVisible();
  });

  test('a wrong password and an unknown email give the same answer', async ({ page, context }) => {
    const { email } = await registerByApi(page.request);
    await context.clearCookies();
    await page.goto('/login');

    await signInWithForm(page, email, 'not my password', en.auth.login.submit);
    await expect(formError(page)).toHaveText(en.errors.AUTH_INVALID_CREDENTIALS);

    await signInWithForm(page, uniqueEmail('nobody'), 'not my password', en.auth.login.submit);
    await expect(formError(page)).toHaveText(en.errors.AUTH_INVALID_CREDENTIALS);
  });

  test('explains a Google sign-in the API sent back', async ({ page }) => {
    await page.goto('/login?oauthError=OAUTH_STATE_INVALID');
    await expect(formError(page)).toHaveText(en.errors.OAUTH_STATE_INVALID);
  });

  test('a signed-in person who opens /login goes straight on', async ({ page }) => {
    await registerByApi(page.request);
    await page.goto('/login?next=/styleguide');
    await expect(page).toHaveURL(/\/styleguide$/);
  });

  test('signing out from the menu ends the session', async ({ page }) => {
    await registerByApi(page.request);
    await page.goto('/');

    await page.getByRole('button', { name: en.header.account }).click();
    await page.getByRole('menuitem', { name: en.header.signOut }).click();

    await expect(page.getByRole('link', { name: en.header.signIn })).toBeVisible();
    expect((await page.request.get('/api/v1/me')).status()).toBe(401);
  });
});
