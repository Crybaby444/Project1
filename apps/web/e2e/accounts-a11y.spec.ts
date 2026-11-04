import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { asOwnVisitor, registerByApi } from './support/accounts';

const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 800 };

const PUBLIC_PAGES = ['/login', '/register', '/forgot-password', '/reset-password?token=x', '/verify-email'];
const PRIVATE_PAGES = ['/settings', '/settings/security'];

async function check(page: Page, path: string) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    // A broken link on /verify-email is meant to get its 400 from the API.
    if (message.type() === 'error' && !message.text().includes('status of 400')) errors.push(message.text());
  });

  await page.goto(path);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.waitForLoadState('networkidle');

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const { violations } = await new AxeBuilder({ page }).analyze();
  const serious = violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target.join(' ')}`);
  expect(serious).toEqual([]);
  expect(errors).toEqual([]);
}

for (const theme of ['light', 'dark'] as const) {
  for (const viewport of [PHONE, DESKTOP]) {
    const size = viewport === PHONE ? 'phone' : 'desktop';

    test.describe(`account pages in ${theme} on a ${size}`, () => {
      test.use({ viewport });

      test.beforeEach(async ({ context, baseURL }) => {
        await asOwnVisitor(context);
        await context.addCookies([{ name: 'yoyo-theme', value: theme, url: baseURL! }]);
      });

      for (const path of PUBLIC_PAGES) {
        test(`${path}: no serious a11y issues, fits the screen`, async ({ page }) => {
          await check(page, path);
        });
      }

      for (const path of PRIVATE_PAGES) {
        test(`${path} (signed in, email not confirmed): no serious a11y issues, fits the screen`, async ({
          page,
        }) => {
          await registerByApi(page.request, { locale: 'ru', name: 'Мария Петрова' });
          await check(page, `/ru${path}`);
        });
      }

      test('the open user menu and the delete dialog pass too', async ({ page }) => {
        await registerByApi(page.request);
        await page.goto('/settings/security');
        await page.getByRole('button', { name: /^Account menu/ }).click();
        await expect(page.getByRole('menu')).toBeVisible();
        let { violations } = await new AxeBuilder({ page }).analyze();
        expect(
          violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id),
        ).toEqual([]);
        await page.keyboard.press('Escape');

        await page.getByRole('button', { name: 'Delete account' }).click();
        await expect(page.getByRole('dialog')).toBeVisible();
        ({ violations } = await new AxeBuilder({ page }).analyze());
        expect(
          violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id),
        ).toEqual([]);
      });
    });
  }
}
