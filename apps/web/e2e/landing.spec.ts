import { DEFAULT_BOOKING_SETTINGS } from '@yoyo/domain';
import { expect, test } from '@playwright/test';
import en from '../messages/site/en.json' with { type: 'json' };
import main from '../messages/en.json' with { type: 'json' };
import lv from '../messages/site/lv.json' with { type: 'json' };
import ru from '../messages/site/ru.json' with { type: 'json' };
import { asOwnVisitor, registerByApi } from './support/accounts';

const LANGUAGES = [
  { locale: 'en', prefix: '', m: en },
  { locale: 'lv', prefix: '/lv', m: lv },
  { locale: 'ru', prefix: '/ru', m: ru },
] as const;

for (const { locale, prefix, m } of LANGUAGES) {
  test(`What is Yoyo in ${locale}: one h1, every scene, the real numbers in the rules`, async ({ page }) => {
    await page.goto(`${prefix}/what-is-yoyo`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1, name: 'Yoyo' })).toBeAttached();
    for (const scene of ['hero', 'night', 'what', 'sides', 'rules', 'people', 'inside', 'finale']) {
      await expect(page.locator(`[data-home="${scene}"]`)).toHaveCount(1);
    }
    await expect(page.getByRole('heading', { level: 2, name: m.landing.people.title })).toBeAttached();
    await expect(page.getByRole('heading', { level: 2, name: new RegExp(m.landing.finale.line1, 'i') })).toBeAttached();
    // The numbers are the rules the deals keep, not typed copy.
    await expect(page.locator('[data-home="rules"]')).toContainText(`${DEFAULT_BOOKING_SETTINGS.inspectionHours}`);
  });
}

test('What is Yoyo walks through both sides: the switch shows the lender’s steps, and both are in the HTML', async ({ page }) => {
  await page.goto('/what-is-yoyo');
  const sides = page.locator('[data-home="sides"]');
  await expect(sides.locator('[data-side]')).toHaveCount(2);
  await expect(sides.getByRole('heading', { level: 3, name: en.howItWorks.renter.steps.contract.title })).toBeVisible();
  await sides.getByRole('tab', { name: en.landing.sides.lend.tab }).click();
  await expect(sides.getByRole('heading', { level: 3, name: en.howItWorks.owner.steps.review.title })).toBeVisible();
  await expect(sides.getByRole('heading', { level: 3, name: en.howItWorks.renter.steps.contract.title })).toBeHidden();
});

test('What is Yoyo has nothing around it: no header or footer, and the way home is at its very end (owner, 2026-11-16)', async ({ page }) => {
  await page.goto('/what-is-yoyo');
  await expect(page.locator('[data-site-header]')).toHaveCount(0);
  await expect(page.locator('[data-site-footer]')).toHaveCount(0);
  const back = page.locator('[data-home="finale"]').getByRole('link', { name: en.landing.finale.home });
  await expect(back).toHaveAttribute('href', '/');
});

test('the home: the promise, and the search only in the header, on the results page too (owner, 2026-11-28)', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: main.market.hero.title })).toBeVisible();
  await expect(page.getByRole('main').getByRole('search')).toHaveCount(0);
  const search = page.getByRole('banner').getByRole('combobox', { name: main.nav.search });
  await search.fill('drill');
  await search.press('Enter');
  await expect(page).toHaveURL(/\/search\?q=drill$/);
  // The results page has no box of its own: the header's holds the words.
  await expect(page.getByRole('main').getByRole('search')).toHaveCount(0);
  await expect(page.getByRole('banner').getByRole('combobox', { name: main.nav.search })).toHaveValue('drill');
  await page.goto('/');
  await expect(page.getByRole('banner').getByRole('navigation', { name: main.nav.main })).toBeVisible();
  await expect(page.getByRole('banner').getByRole('link', { name: main.nav.whatIsYoyo })).toHaveAttribute('href', '/what-is-yoyo');
});

test('on a phone the header’s magnifier opens the search under the bar', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('banner').getByRole('button', { name: main.catalog.search.label }).click();
  const search = page.getByRole('banner').getByRole('combobox', { name: main.nav.search }).last();
  await expect(search).toBeFocused();
  await search.fill('tent');
  await search.press('Enter');
  await expect(page).toHaveURL(/\/search\?q=tent$/);
});

test('a signed-in person also gets the page without the header', async ({ page, context }) => {
  await asOwnVisitor(context);
  await registerByApi(page.request);
  await page.goto('/what-is-yoyo');
  await expect(page.getByRole('heading', { level: 1, name: 'Yoyo' })).toBeAttached();
  await expect(page.getByRole('button', { name: /^Account menu/ })).toHaveCount(0);
});
