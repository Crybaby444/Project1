import { expect, test } from '@playwright/test';
import en from '../messages/en.json' with { type: 'json' };
import lv from '../messages/lv.json' with { type: 'json' };
import ru from '../messages/ru.json' with { type: 'json' };

test.describe('home page in three languages', () => {
  test('English is served at / without a prefix', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByText(en.home.tagline)).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'Yoyo' })).toBeVisible();
  });

  test('Latvian is served at /lv', async ({ page }) => {
    await page.goto('/lv');
    await expect(page.locator('html')).toHaveAttribute('lang', 'lv');
    await expect(page.getByText(lv.home.tagline)).toBeVisible();
  });

  test('Russian is served at /ru', async ({ page }) => {
    await page.goto('/ru');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
    await expect(page.getByText(ru.home.tagline)).toBeVisible();
  });

  test('the language switcher moves between locales', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Русский' }).click();
    await expect(page).toHaveURL(/\/ru$/);
    await expect(page.getByText(ru.home.tagline)).toBeVisible();
    await page.getByRole('link', { name: 'English' }).click();
    await expect(page.getByText(en.home.tagline)).toBeVisible();
  });
});

test.describe('unknown or wrong-case locale prefixes', () => {
  for (const bad of ['/de', '/xx/catalog']) {
    test(`${bad} answers a styled 404, not a crash or a stray page`, async ({ page }) => {
      const res = await page.goto(bad);
      expect(res?.status()).toBe(404);
      await expect(page.getByRole('heading', { name: en.notFound.title })).toBeVisible();
      await expect(page.getByRole('link', { name: en.notFound.back })).toBeVisible();
    });
  }

  test('/LV redirects to the canonical lowercase /lv instead of a stray page', async ({ page }) => {
    const res = await page.goto('/LV');
    expect(res?.status()).toBe(200);
    await expect(page).toHaveURL(/\/lv$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'lv');
    await expect(page.getByText(lv.home.tagline)).toBeVisible();
  });
});
