import { expect, test } from '@playwright/test';
import en from '../messages/en.json' with { type: 'json' };

const ONE_YEAR_S = 365 * 24 * 60 * 60;

test.describe('first visit follows the OS', () => {
  test.use({ colorScheme: 'dark' });

  test('a dark OS gets the dark theme before the page finishes loading', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    expect(await page.getAttribute('html', 'data-theme')).toBe('dark');
  });
});

test.describe('a saved theme', () => {
  test('is already in the HTML the server sends', async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: 'yoyo-theme', value: 'light', url: baseURL! }]);
    const html = await (await page.request.get('/')).text();
    expect(html).toMatch(/<html[^>]*data-theme="light"/);
  });

  test('switching is saved for a year and survives a reload', async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: 'yoyo-theme', value: 'light', url: baseURL! }]);
    await page.goto('/');

    await page.getByRole('button', { name: en.theme.toggle }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    const cookie = (await context.cookies()).find((c) => c.name === 'yoyo-theme');
    expect(cookie?.value).toBe('dark');
    expect(cookie?.path).toBe('/');
    expect(cookie?.sameSite).toBe('Lax');
    expect(cookie!.expires - Date.now() / 1000).toBeGreaterThan(ONE_YEAR_S - 60 * 60);
  });
});

test.describe('with motion allowed', () => {
  test('the circular switch runs without errors and lands on the new theme', async ({ page, context, baseURL }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
    await context.addCookies([{ name: 'yoyo-theme', value: 'dark', url: baseURL! }]);
    await page.goto('/');

    await page.getByRole('button', { name: en.theme.toggle }).click();

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.waitForTimeout(600); // let the 450 ms reveal finish
    expect(errors).toEqual([]);
  });
});

test.describe('reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('switches the theme instantly with no animation', async ({ page }) => {
    await page.goto('/');
    const before = await page.getAttribute('html', 'data-theme');

    await page.getByRole('button', { name: en.theme.toggle }).click();

    await expect(page.locator('html')).not.toHaveAttribute('data-theme', before ?? '');
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  });
});
