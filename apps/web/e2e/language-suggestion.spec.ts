import { expect, test, type BrowserContext } from '@playwright/test';
import en from '../messages/en.json' with { type: 'json' };
import suggestion from '../messages/language-suggestion.json' with { type: 'json' };

/**
 * Every URL serves its own language (SEO rule, 2026-11-06): no redirect from Accept-Language or a
 * cookie. A first visit whose browser prefers another language the site has gets a small bar in that
 * language instead; either answer is remembered in NEXT_LOCALE and the bar never comes back. Runs in
 * Chromium and on an iPhone (WebKit project in playwright.config.ts).
 */

// A visitor who has not answered yet: none of the cookie the other specs start with.
test.use({ storageState: { cookies: [], origins: [] } });

const choice = async (context: BrowserContext) =>
  (await context.cookies()).find((cookie) => cookie.name === 'NEXT_LOCALE')?.value;

test.describe('no forced redirect', () => {
  test('/ answers in English even for a Latvian browser or a Russian cookie', async ({ request }) => {
    const latvian = await request.get('/', {
      headers: { 'Accept-Language': 'lv-LV,lv;q=0.9' },
      maxRedirects: 0,
    });
    expect(latvian.status()).toBe(200);
    expect(await latvian.text()).toContain('<html lang="en"');
    expect(latvian.headers()['set-cookie'] ?? '').not.toContain('NEXT_LOCALE');

    const cookie = await request.get('/faq', { headers: { Cookie: 'NEXT_LOCALE=ru' }, maxRedirects: 0 });
    expect(cookie.status()).toBe(200);
    expect(await cookie.text()).toContain('<html lang="en"');
  });

  test('/lv answers in Latvian for an English browser', async ({ request }) => {
    const response = await request.get('/lv', {
      headers: { 'Accept-Language': 'en-US,en;q=0.9' },
      maxRedirects: 0,
    });
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain('<html lang="lv"');
  });
});

test.describe('a Latvian browser on the English site', () => {
  test.use({ locale: 'lv-LV' });

  test('is asked in Latvian, and "Palikt" keeps English for good', async ({ page, context }) => {
    await page.goto('/faq');
    const bar = page.getByRole('region', { name: suggestion.lv.label });
    await expect(bar).toBeVisible();
    await expect(bar).toHaveAttribute('lang', 'lv');
    await expect(bar).toContainText(suggestion.lv.text);
    // Asking is all it does: the page is still English at the same address.
    await expect(page).toHaveURL(/\/faq$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    await bar.getByRole('button', { name: suggestion.lv.stay }).click();
    await expect(bar).toBeHidden();
    expect(await choice(context)).toBe('en');

    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('region', { name: suggestion.lv.label })).toHaveCount(0);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('"Pāriet" opens the same page in Latvian and is remembered', async ({ page, context }) => {
    await page.goto('/faq');
    await page
      .getByRole('region', { name: suggestion.lv.label })
      .getByRole('button', { name: suggestion.lv.switch })
      .click();
    await expect(page).toHaveURL(/\/lv\/faq$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'lv');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await choice(context)).toBe('lv');
    await expect(page.getByRole('region', { name: suggestion.lv.label })).toHaveCount(0);

    // Back on an English address later: still no redirect, and no second question.
    await page.goto('/faq');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('region', { name: suggestion.lv.label })).toHaveCount(0);
  });

  test('is not asked on the Latvian site itself', async ({ page }) => {
    await page.goto('/lv/faq');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('[data-language-suggestion]')).toHaveCount(0);
  });

  test('a choice in the header language switcher counts as an answer', async ({ page, context }) => {
    await page.goto('/login');
    await page
      .locator('[data-site-header]')
      .getByRole('button', { name: new RegExp(`^${en.language.label}: `) })
      .click();
    await page.locator('[data-site-header]').getByRole('menuitemradio', { name: 'Русский' }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
    expect(await choice(context)).toBe('ru');
    await expect(page.locator('[data-language-suggestion]')).toHaveCount(0);
  });
});
