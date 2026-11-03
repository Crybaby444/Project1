import { expect, test } from '@playwright/test';
import en from '../messages/en.json' with { type: 'json' };

test.describe('dark system theme', () => {
  test.use({ colorScheme: 'dark' });

  test('first paint is already dark', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    expect(await page.getAttribute('html', 'data-theme')).toBe('dark');
  });

  test('a saved theme is in the server HTML and survives a reload after switching', async ({
    page,
    context,
    baseURL,
  }) => {
    await context.addCookies([{ name: 'yoyo-theme', value: 'light', url: baseURL! }]);
    const html = await (await page.request.get('/')).text();
    expect(html).toMatch(/<html[^>]*data-theme="light"/);

    await page.goto('/');
    expect(await page.getAttribute('html', 'data-theme')).toBe('light');
    await page.getByRole('button', { name: en.theme.toggle }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    expect(await page.getAttribute('html', 'data-theme')).toBe('dark');
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce', colorScheme: 'light' });

  test('theme changes without any animation', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: en.theme.toggle }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  });
});
