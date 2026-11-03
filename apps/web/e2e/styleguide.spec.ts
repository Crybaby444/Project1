import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import en from '../messages/en.json' with { type: 'json' };
import lv from '../messages/lv.json' with { type: 'json' };
import ru from '../messages/ru.json' with { type: 'json' };

const LOCALES = [
  { prefix: '', messages: en },
  { prefix: '/lv', messages: lv },
  { prefix: '/ru', messages: ru },
] as const;

function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

for (const theme of ['light', 'dark'] as const) {
  for (const { prefix, messages } of LOCALES) {
    test.describe(`styleguide ${theme} ${prefix || '/en'}`, () => {
      test.beforeEach(async ({ context, baseURL }) => {
        await context.addCookies([{ name: 'yoyo-theme', value: theme, url: baseURL! }]);
      });

      test('renders cleanly and passes axe', async ({ page }) => {
        const errors = collectConsoleErrors(page);
        await page.goto(`${prefix}/styleguide`);
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        await expect(page.getByText(messages.apiStatus.online)).toBeVisible();

        const results = await new AxeBuilder({ page }).analyze();
        const serious = results.violations.filter(
          (v) => v.impact === 'serious' || v.impact === 'critical',
        );
        expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual(
          [],
        );
        expect(errors).toEqual([]);
      });

      test('has no horizontal scroll on a 390px phone', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(`${prefix}/styleguide`);
        const { scrollWidth, innerWidth } = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
        }));
        expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
      });
    });
  }
}

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the marquee stands still and stickers do not spin', async ({ page }) => {
    await page.goto('/styleguide');
    const track = page.locator('[data-marquee-track]').first();
    expect(await track.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');

    const sticker = page.getByRole('img', { name: en.styleguide.stickerVerified });
    await sticker.click();
    await expect(sticker).not.toHaveAttribute('data-spinning');
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  });
});

test('buttons never overflow their text in long languages', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const prefix of ['/lv', '/ru']) {
    await page.goto(`${prefix}/styleguide`);
    const clipped = await page
      .locator('main button, main a')
      .evaluateAll((els) =>
        els.filter((el) => el.scrollWidth > el.clientWidth + 1).map((el) => el.textContent),
      );
    expect(clipped).toEqual([]);
  }
});
