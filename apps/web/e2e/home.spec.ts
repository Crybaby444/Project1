import { expect, test } from '@playwright/test';
import en from '../messages/en.json' with { type: 'json' };
import lv from '../messages/lv.json' with { type: 'json' };
import ru from '../messages/ru.json' with { type: 'json' };
import siteEn from '../messages/site/en.json' with { type: 'json' };
import siteLv from '../messages/site/lv.json' with { type: 'json' };
import siteRu from '../messages/site/ru.json' with { type: 'json' };

test.describe('home page in three languages', () => {
  test('English is served without a prefix', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('heading', { level: 1, name: en.market.hero.title })).toBeVisible();
  });

  test('Latvian is served at /lv', async ({ page }) => {
    await page.goto('/lv');
    await expect(page.locator('html')).toHaveAttribute('lang', 'lv');
    await expect(page.getByRole('heading', { level: 1, name: lv.market.hero.title })).toBeVisible();
  });

  test('Russian is served at /ru', async ({ page }) => {
    await page.goto('/ru');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
    await expect(page.getByRole('heading', { level: 1, name: ru.market.hero.title })).toBeVisible();
  });

  test('the language switcher moves between locales', async ({ page }) => {
    await page.goto('/faq');
    const header = page.getByRole('banner');
    await header.getByRole('button', { name: /^Language: English/ }).click();
    await header.getByRole('menuitemradio', { name: 'Русский' }).click();
    await expect(page).toHaveURL(/\/ru\/faq$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
    await header.getByRole('button', { name: /^Язык: Русский/ }).click();
    await header.getByRole('menuitemradio', { name: 'English' }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('What is Yoyo opens with only the word and the yo-yo, in every language', async ({ page }) => {
    for (const [prefix, line] of [['', siteEn.landing.hero.line], ['/lv', siteLv.landing.hero.line], ['/ru', siteRu.landing.hero.line]] as const) {
      await page.goto(`${prefix}/what-is-yoyo`);
      await expect(page.getByRole('heading', { level: 1, name: 'Yoyo' })).toBeVisible();
      await expect(page.locator('[data-home="hero"]').getByText(line)).toHaveCount(0);
      await expect(page.locator('[data-home="hero"]').getByRole('link')).toHaveCount(0);
    }
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
    await expect(page.getByRole('heading', { level: 1, name: lv.market.hero.title })).toBeVisible();
  });
});

test.describe('site footer', () => {
  test('switching the language in the footer keeps the focus in the footer', async ({ page }) => {
    await page.goto('/terms');
    const footerLanguages = page.getByRole('navigation', { name: siteEn.footer.languageLabel });
    await footerLanguages.getByRole('link', { name: 'Latviešu' }).click();
    await expect(page).toHaveURL(/\/lv\/terms$/);
    await expect(
      page.getByRole('navigation', { name: siteLv.footer.languageLabel }).getByRole('link', { name: 'Latviešu' }),
    ).toBeFocused();
  });

  test('the footer theme choice switches the theme', async ({ page }) => {
    await page.goto('/faq'); // the home has no theme to choose
    const footer = page.getByRole('contentinfo');
    await footer.getByText(en.theme.dark, { exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await footer.getByText(en.theme.light, { exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });
});
