import { expect, test } from '@playwright/test';
import en from '../messages/en.json' with { type: 'json' };
import ru from '../messages/ru.json' with { type: 'json' };

test('serves English at the root and other locales under a prefix', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByText(en.home.tagline)).toBeVisible();

  await page.goto('/lv');
  await expect(page.locator('html')).toHaveAttribute('lang', 'lv');

  await page.goto('/ru');
  await expect(page.getByText(ru.home.tagline)).toBeVisible();
});

test('switches language from the header', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Русский' }).click();
  await expect(page).toHaveURL(/\/ru$/);
  await expect(page.getByText(ru.home.tagline)).toBeVisible();
});

// Review Focus 2: unknown or wrongly-cased locales render the styled 404.
for (const bad of ['/de', '/LV']) {
  test(`renders the styled 404 for ${bad}`, async ({ page }) => {
    const res = await page.goto(bad);
    expect(res?.status()).toBe(404);
    await expect(page.getByText(en.notFound.back)).toBeVisible();
  });
}
