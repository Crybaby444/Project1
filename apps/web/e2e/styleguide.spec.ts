import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import en from '../messages/en.json' with { type: 'json' };
import lv from '../messages/lv.json' with { type: 'json' };
import ru from '../messages/ru.json' with { type: 'json' };

const LOCALES = [
  { prefix: '', messages: en },
  { prefix: '/lv', messages: lv },
  { prefix: '/ru', messages: ru },
] as const;

for (const theme of ['light', 'dark'] as const) {
  for (const { prefix, messages } of LOCALES) {
    test.describe(`styleguide ${theme} ${prefix || '/'}`, () => {
      test.beforeEach(async ({ context, baseURL }) => {
        await context.addCookies([{ name: 'yoyo-theme', value: theme, url: baseURL! }]);
      });

      test('has no console errors and no serious accessibility violations', async ({ page }) => {
        const errors: string[] = [];
        page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));
        page.on('pageerror', (err) => errors.push(err.message));

        await page.goto(`${prefix}/styleguide`);
        await expect(page.getByRole('heading', { level: 1, name: messages.styleguide.title })).toBeVisible();
        await expect(page.getByText(messages.apiStatus.online)).toBeVisible();
        expect(await page.getAttribute('html', 'data-theme')).toBe(theme);

        const results = await new AxeBuilder({ page }).analyze();
        const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
        expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual(
          [],
        );
        expect(errors).toEqual([]);
      });

      // Review Focus 3: long Latvian and Russian strings fit a 390px phone.
      test('fits a 390px phone without horizontal scrolling', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(`${prefix}/styleguide`);
        const { scrollWidth, innerWidth } = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
        }));
        expect(scrollWidth).toBeLessThanOrEqual(innerWidth);

        // Button labels are never clipped.
        const clipped = await page.$$eval('button, a[data-variant]', (els) =>
          els.filter((el) => el.scrollWidth > el.clientWidth + 1).map((el) => el.textContent),
        );
        expect(clipped).toEqual([]);
      });
    });
  }
}

// Review Focus 5: under reduced motion the marquee stands still.
test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('stops the marquee', async ({ page }) => {
    await page.goto('/styleguide');
    const track = page.locator('[data-marquee-track]');
    await expect(track).toBeVisible();
    expect(await track.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
  });
});

test('the marquee moves without reduced motion', async ({ page }) => {
  await page.goto('/styleguide');
  expect(
    await page.locator('[data-marquee-track]').evaluate((el) => getComputedStyle(el).animationName),
  ).toBe('yoyo-marquee');
});
