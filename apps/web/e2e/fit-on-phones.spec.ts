import { expect, test, type Page } from '@playwright/test';
import en from '../messages/en.json' with { type: 'json' };
import lv from '../messages/lv.json' with { type: 'json' };
import ru from '../messages/ru.json' with { type: 'json' };
import { asOwnVisitor, PASSWORD, registerByApi, uniqueEmail } from './support/accounts';
import { overflows } from './support/layout';
import { latestTo, linkFrom } from './support/mailpit';

/**
 * Long words in the big display titles must fit narrow phones in every language: the page never
 * scrolls sideways and no title is wider than its own box. Found on a real iPhone, where the Russian
 * "ПОЧТА ПОДТВЕРЖДЕНА" ran past the card and made the whole page wider than the screen.
 */
const LOCALES = [
  { locale: 'en', prefix: '', m: en },
  { locale: 'lv', prefix: '/lv', m: lv },
  { locale: 'ru', prefix: '/ru', m: ru },
] as const;

/** The smallest phones still around (iPhone SE 1st gen) and a current iPhone. */
const WIDTHS = [320, 390];

for (const { locale, prefix, m } of LOCALES) {
  for (const width of WIDTHS) {
    test.describe(`${locale} at ${width}px`, () => {
      test.use({ viewport: { width, height: 800 } });

      test.beforeEach(async ({ context }) => {
        await asOwnVisitor(context);
      });

      /** Waits for the screen (its h1, when given), then checks it fits; failures are collected. */
      async function fits(page: Page, screen: string, title?: string) {
        await test.step(screen, async () => {
          if (title) await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
          expect.soft(await overflows(page), `${screen} overflows at ${width}px (${locale})`).toEqual([]);
        });
      }

      test('public pages and signed-out auth screens fit', async ({ page }) => {
        await page.goto(`${prefix}/`);
        await fits(page, 'home', 'Yoyo');

        await page.goto(`${prefix}/no-such-page`);
        await fits(page, 'not found', m.notFound.title);

        await page.goto('/no-such-file.txt');
        await fits(page, 'global not found', en.notFound.title);

        if ((await page.goto(`${prefix}/styleguide`))?.status() === 200) {
          await fits(page, 'styleguide', m.styleguide.title);
        }

        await page.goto(`${prefix}/login`);
        await fits(page, 'login', m.auth.login.title);

        await page.goto(`${prefix}/register`);
        await fits(page, 'register', m.auth.register.title);

        await page.goto(`${prefix}/forgot-password`);
        await fits(page, 'forgot password', m.auth.forgot.title);
        await page.getByLabel(m.auth.fields.email).fill(uniqueEmail('nobody'));
        await page.getByRole('button', { name: m.auth.forgot.submit }).click();
        await fits(page, 'forgot password: check your email', m.auth.forgot.sent.title);

        await page.goto(`${prefix}/reset-password`);
        await fits(page, 'reset password without a token', m.auth.reset.invalid.title);

        await page.goto(`${prefix}/reset-password?token=not-a-real-token`);
        await fits(page, 'reset password form', m.auth.reset.title);
        await page.getByLabel(m.auth.fields.newPassword, { exact: true }).fill(PASSWORD);
        await page.getByLabel(m.auth.fields.repeatPassword).fill(PASSWORD);
        await page.getByRole('button', { name: m.auth.reset.submit }).click();
        await fits(page, 'reset password with a bad token', m.auth.reset.invalid.title);

        await page.goto(`${prefix}/verify-email`);
        await fits(page, 'verify email without a token', m.auth.verify.invalid.title);

        await page.goto(`${prefix}/verify-email?token=not-a-real-token`);
        await fits(page, 'verify email with a bad token', m.auth.verify.invalid.title);
      });

      test('screens reached from real emails, and the settings, fit', async ({ page, context }) => {
        const { email } = await registerByApi(page.request, { locale });
        const verifyLink = linkFrom(await latestTo(email), '/verify-email');
        expect(verifyLink).toMatch(new RegExp(`^${prefix}/verify-email\\?token=`));

        await page.goto(verifyLink);
        await fits(page, 'verify email: confirmed', m.auth.verify.done.title);
        await page.goto(verifyLink);
        await fits(page, 'verify email: link used', m.auth.verify.used.title);

        await page.goto(`${prefix}/settings`);
        await fits(page, 'settings', m.settings.title);
        await page.goto(`${prefix}/settings/security`);
        await fits(page, 'security settings', m.settings.title);

        await context.clearCookies();
        await page.goto(`${prefix}/forgot-password`);
        await page.getByLabel(m.auth.fields.email).fill(email);
        await page.getByRole('button', { name: m.auth.forgot.submit }).click();
        await expect(page.getByRole('heading', { level: 1, name: m.auth.forgot.sent.title })).toBeVisible();
        const resetLink = linkFrom(
          await latestTo(email, (mail) => mail.text.includes('/reset-password')),
          '/reset-password',
        );

        await page.goto(resetLink);
        await fits(page, 'reset password: valid link', m.auth.reset.title);
        await page.getByLabel(m.auth.fields.newPassword, { exact: true }).fill('a brand new passphrase');
        await page.getByLabel(m.auth.fields.repeatPassword).fill('a brand new passphrase');
        await page.getByRole('button', { name: m.auth.reset.submit }).click();
        await fits(page, 'home after the reset', 'Yoyo');

        await page.goto(resetLink);
        await page.getByLabel(m.auth.fields.newPassword, { exact: true }).fill('yet another passphrase');
        await page.getByLabel(m.auth.fields.repeatPassword).fill('yet another passphrase');
        await page.getByRole('button', { name: m.auth.reset.submit }).click();
        await fits(page, 'reset password: link used', m.auth.reset.used.title);
      });
    });
  }
}
