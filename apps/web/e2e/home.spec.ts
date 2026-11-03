import { expect, test } from '@playwright/test';
import en from '../messages/en.json' with { type: 'json' };
import ru from '../messages/ru.json' with { type: 'json' };

test('English is served without a prefix', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByText(en.home.tagline)).toBeVisible();
});

test('Latvian and Russian live under their prefixes', async ({ page }) => {
  await page.goto('/lv');
  await expect(page.locator('html')).toHaveAttribute('lang', 'lv');
  await page.goto('/ru');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await expect(page.getByText(ru.home.tagline)).toBeVisible();
});

test('language switcher keeps the visitor on the same page', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Latviešu' }).click();
  await expect(page).toHaveURL(/\/lv$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'lv');
});

for (const bad of ['/de', '/LV', '/en/nothing-here']) {
  test(`unknown path ${bad} renders the styled 404`, async ({ page }) => {
    const res = await page.goto(bad);
    expect(res?.status()).toBe(404);
    await expect(page.getByText(en.notFound.back)).toBeVisible();
  });
}
