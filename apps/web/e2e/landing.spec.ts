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

test('the home is the marketplace: search what, where and when, items on the string, categories in the header (owner, 2026-11-16)', async ({ page }) => {
  await page.goto('/');
  const search = page.locator('[data-home-search]');
  await search.getByLabel(main.market.search.what).fill('drill');
  await search.getByRole('button', { name: main.market.search.submit }).click();
  await expect(page).toHaveURL(/\/search\?q=drill$/);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: main.market.hero.title })).toBeVisible();
  await expect(page.getByRole('banner').getByRole('navigation', { name: main.nav.main })).toBeVisible();
  await expect(page.getByRole('banner').getByRole('link', { name: main.nav.whatIsYoyo })).toHaveAttribute('href', '/what-is-yoyo');
});

test('a signed-in person also gets the page without the header', async ({ page, context }) => {
  await asOwnVisitor(context);
  await registerByApi(page.request);
  await page.goto('/what-is-yoyo');
  await expect(page.getByRole('heading', { level: 1, name: 'Yoyo' })).toBeAttached();
  await expect(page.getByRole('button', { name: /^Account menu/ })).toHaveCount(0);
});
