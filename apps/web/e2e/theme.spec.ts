import { expect, test } from '@playwright/test';
import en from '../messages/en.json' with { type: 'json' };

test.describe('system dark theme', () => {
  test.use({ colorScheme: 'dark' });

  // Review Focus 1: no light flash — the theme is set before the first paint.
  test('is applied before the page finishes loading', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    expect(await page.getAttribute('html', 'data-theme')).toBe('dark');
  });
});

test.describe('saved theme', () => {
  test('is rendered by the server', async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: 'yoyo-theme', value: 'light', url: baseURL! }]);
    const html = await (await page.request.get('/')).text();
    expect(html).toMatch(/<html[^>]*data-theme="light"/);
  });

  test('survives a reload after switching', async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: 'yoyo-theme', value: 'light', url: baseURL! }]);
    await page.goto('/');
    expect(await page.getAttribute('html', 'data-theme')).toBe('light');
    await page.getByRole('button', { name: en.theme.toggle }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    expect(await page.getAttribute('html', 'data-theme')).toBe('dark');
  });
});

// Review Focus 5: with reduced motion the theme changes without any animation.
test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce', colorScheme: 'light' });

  test('switches the theme without animations', async ({ page }) => {
    await page.goto('/');
    const toggle = page.getByRole('button', { name: en.theme.toggle });
    await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  });
});
