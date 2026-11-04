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
import { latestTo, linkFrom } from './support/mailpit';

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

test.describe('email confirmation', () => {
  test('the link from the email confirms it once; a second visit says it was used (Review Focus 5)', async ({
    page,
  }) => {
    const { email } = await registerByApi(page.request);
    const link = linkFrom(await latestTo(email), '/verify-email');
    await page.goto('/');
    await expect(page.getByText(en.banner.verifyEmail.title)).toBeVisible();

    await page.goto(link);
    await expect(page.getByRole('heading', { name: en.auth.verify.done.title })).toBeVisible();
    await page.getByRole('link', { name: en.auth.verify.continue }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Yoyo' })).toBeVisible();
    await expect(page.getByText(en.banner.verifyEmail.title)).toHaveCount(0);

    await page.goto(link);
    await expect(page.getByRole('heading', { name: en.auth.verify.used.title })).toBeVisible();
  });

  test('a link without a token is explained, with a way to sign in', async ({ page }) => {
    await page.goto('/verify-email');
    await expect(page.getByRole('heading', { name: en.auth.verify.invalid.title })).toBeVisible();
    await expect(page.getByRole('main').getByRole('link', { name: en.auth.verify.signIn })).toHaveAttribute(
      'href',
      '/login',
    );
  });
});

test.describe('forgotten password', () => {
  test('known and unknown emails get the very same screen (Review Focus 3)', async ({ page, context }) => {
    const { email } = await registerByApi(page.request);
    await context.clearCookies();
    const sentScreen = async (address: string) => {
      await page.goto('/forgot-password');
      await page.getByLabel(en.auth.fields.email).fill(address);
      await page.getByRole('button', { name: en.auth.forgot.submit }).click();
      await expect(page.getByRole('heading', { name: en.auth.forgot.sent.title })).toBeVisible();
      return (await page.locator('main').innerText()).replace(address, '<email>');
    };

    const known = await sentScreen(email);
    const unknown = await sentScreen(uniqueEmail('nobody'));
    expect(unknown).toBe(known);
  });

  test('the reset link sets a new password and signs in; the old one stops working', async ({
    page,
    context,
  }) => {
    const { email, password: oldPassword } = await registerByApi(page.request);
    await context.clearCookies();
    const newPassword = 'a brand new passphrase';

    await page.goto('/forgot-password');
    await page.getByLabel(en.auth.fields.email).fill(email);
    await page.getByRole('button', { name: en.auth.forgot.submit }).click();
    await expect(page.getByRole('heading', { name: en.auth.forgot.sent.title })).toBeVisible();

    const mail = await latestTo(email, (m) => m.text.includes('/reset-password'));
    await page.goto(linkFrom(mail, '/reset-password'));
    await page.getByLabel(en.auth.fields.newPassword, { exact: true }).fill(newPassword);
    await page.getByLabel(en.auth.fields.repeatPassword).fill(newPassword);
    await page.getByRole('button', { name: en.auth.reset.submit }).click();

    await expect(page.getByRole('status').filter({ hasText: en.auth.reset.done })).toBeVisible();
    await expect(page.getByRole('button', { name: en.header.account })).toBeVisible();

    await context.clearCookies();
    await page.goto('/login');
    await signInWithForm(page, email, oldPassword, en.auth.login.submit);
    await expect(formError(page)).toHaveText(en.errors.AUTH_INVALID_CREDENTIALS);
    await signInWithForm(page, email, newPassword, en.auth.login.submit);
    await expect(page.getByRole('button', { name: en.header.account })).toBeVisible();
  });
});
