import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import en from '../messages/en.json' with { type: 'json' };
import lv from '../messages/lv.json' with { type: 'json' };
import ru from '../messages/ru.json' with { type: 'json' };

const PHONE = { width: 390, height: 844 };
const LOCALES = [
  { prefix: '', messages: en },
  { prefix: '/lv', messages: lv },
  { prefix: '/ru', messages: ru },
];

for (const theme of ['light', 'dark'] as const) {
  for (const { prefix, messages } of LOCALES) {
    test(`styleguide ${prefix || '/'} in ${theme}: no errors, no serious a11y issues, fits a phone`, async ({
      page,
      context,
      baseURL,
    }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
      await context.addCookies([{ name: 'yoyo-theme', value: theme, url: baseURL! }]);
      await page.setViewportSize(PHONE);

      const res = await page.goto(`${prefix}/styleguide`);
      expect(res?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1, name: messages.styleguide.title })).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);

      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

      // The Motion section's statement starts pale and fills to ink as it scrolls past (WordFill).
      // Check contrast as a reader meets it: scrolled through, with every scroll effect settled.
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await page.waitForTimeout(500);
      const { violations } = await new AxeBuilder({ page }).analyze();
      const serious = violations
        .filter((v) => v.impact === 'serious' || v.impact === 'critical')
        .map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target.join(' ')}`);
      expect(serious).toEqual([]);
      expect(errors).toEqual([]);
    });
  }
}

test('the styleguide shows the live API as online', async ({ page }) => {
  await page.goto('/styleguide');
  await expect(page.getByText(en.apiStatus.online)).toBeVisible();
});

test.describe('reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('the marquee does not move at all', async ({ page }) => {
    await page.goto('/styleguide');
    const track = page.locator('[data-marquee-track]').first();
    await expect(track).toBeVisible();
    expect(await track.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
  });
});
