import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import en from '../messages/en.json' with { type: 'json' };
import { asOwnVisitor, registerByApi } from './support/accounts';
import { readyListingByApi, serveBlankMapTiles, signInAsAdmin, submitByApi } from './support/listings';

const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 800 };
const STEPS = ['photos', 'basics', 'attributes', 'price', 'place', 'rules'] as const;

async function expectNoSeriousIssues(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  const serious = violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target.join(' ')}`);
  expect(serious).toEqual([]);
}

async function check(page: Page, path: string, theme: 'light' | 'dark', ready: () => Promise<void>) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
  await page.goto(path);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await ready();
  await page.waitForLoadState('networkidle');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expectNoSeriousIssues(page);
  expect(errors).toEqual([]);
}

for (const theme of ['light', 'dark'] as const) {
  for (const viewport of [PHONE, DESKTOP]) {
    const size = viewport === PHONE ? 'phone' : 'desktop';

    test.describe(`listings screens in ${theme} on a ${size}`, () => {
      test.use({ viewport });

      test.beforeEach(async ({ context, page }) => {
        await asOwnVisitor(context);
        await serveBlankMapTiles(page);
      });

      for (const step of STEPS) {
        test(`builder step ${step}: no serious a11y issues, fits the screen`, async ({ page }) => {
          await registerByApi(page.request);
          await page.request.patch('/api/v1/me', { data: { theme } });
          const listing = await readyListingByApi(page.request);
          await check(page, `/listings/${listing.id}/edit?step=${step}`, theme, async () => {
            await expect(page.getByRole('heading', { level: 2, name: en.builder.steps[step] })).toBeVisible();
            if (step === 'place')
              await expect(page.getByRole('region', { name: en.builder.place.map })).toBeVisible();
          });
        });
      }

      test('my items, with a rejected listing: no serious a11y issues, fits the screen', async ({
        page,
        browser,
        baseURL,
      }) => {
        await registerByApi(page.request);
        await page.request.patch('/api/v1/me', { data: { theme } });
        const listing = await readyListingByApi(page.request);
        await submitByApi(page.request, listing.id);
        const admin = await browser.newContext({ baseURL });
        await asOwnVisitor(admin);
        const adminPage = await admin.newPage();
        await signInAsAdmin(adminPage);
        const { listing: seen } = (await (
          await adminPage.request.get(`/api/v1/listings/${listing.id}`)
        ).json()) as { listing: { version: number } };
        await adminPage.request.post(`/api/v1/admin/listings/${listing.id}/reject`, {
          data: { reason: 'Please show the controllers in a photo too.', version: seen.version },
        });
        await admin.close();
        await check(page, '/ru/dashboard/lending', theme, async () => {
          await expect(page.getByText('Please show the controllers in a photo too.')).toBeVisible();
        });
      });

      test('moderation queue and the reject dialog: no serious a11y issues', async ({ page }) => {
        await signInAsAdmin(page);
        await page.request.patch('/api/v1/me', { data: { theme } });
        await check(page, '/lv/admin/listings', theme, async () => {
          await expect(
            page
              .getByRole('status')
              .or(page.getByRole('heading', { level: 2 }))
              .first(),
          ).toBeVisible();
        });
        const reject = page.getByRole('button', { name: 'Noraidīt' }).first();
        if (await reject.count()) {
          await reject.click();
          await expect(page.getByRole('dialog')).toBeVisible();
          await expectNoSeriousIssues(page);
        }
      });

      test('the crop dialog: no serious a11y issues', async ({ page }) => {
        await registerByApi(page.request);
        await page.request.patch('/api/v1/me', { data: { theme } });
        await page.goto('/listings/new');
        await page
          .getByLabel(en.builder.photos.choose)
          .setInputFiles(new URL('fixtures/item.jpg', import.meta.url).pathname);
        await expect(page.getByRole('img', { name: en.builder.crop.area })).toBeVisible();
        await expectNoSeriousIssues(page);
      });
    });
  }
}

test('a listing can be made and sent with the keyboard alone', async ({ page, context }) => {
  await asOwnVisitor(context);
  await serveBlankMapTiles(page);
  await registerByApi(page.request);
  const listing = await readyListingByApi(page.request);
  await page.goto(`/listings/${listing.id}/edit?step=place`);

  // Unavailable days with the arrow keys and Enter.
  await page.getByRole('grid').first().locator('button[tabindex="0"]').focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('list', { name: en.builder.calendar.list }).getByRole('listitem')).toHaveCount(
    1,
  );

  // To the last step and send, by keyboard.
  const rules = page.getByRole('link', { name: /Rules & publish/ }).first();
  await rules.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 2, name: en.builder.steps.rules })).toBeFocused();
  await page.getByRole('button', { name: en.builder.submit.send }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/dashboard\/lending$/);
});
