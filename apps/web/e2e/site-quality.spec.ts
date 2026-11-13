import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import en from '../messages/site/en.json' with { type: 'json' };
import { overflows } from './support/layout';

/**
 * The landing and service pages, everywhere they are read: three languages, both themes, the smallest
 * phones and a desktop. Nothing sticks out, axe finds nothing serious, the console stays clean.
 */
const PAGES = ['/', '/how-it-works', '/faq', '/terms', '/privacy', '/cookies'];
const PREFIXES = ['', '/lv', '/ru'];
const at = (prefix: string, path: string) => (path === '/' ? prefix || '/' : `${prefix}${path}`);

function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
  return errors;
}

async function seriousAxe(page: Page): Promise<string[]> {
  const { violations } = await new AxeBuilder({ page }).analyze();
  return violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target.join(' ')}`);
}

for (const theme of ['light', 'dark'] as const) {
  for (const width of [320, 390]) {
    test.describe(`${theme} theme at ${width}px`, () => {
      test.use({ viewport: { width, height: 800 } });
      test.beforeEach(async ({ context, baseURL }) => {
        await context.addCookies([{ name: 'yoyo-theme', value: theme, url: baseURL! }]);
      });

      for (const path of PAGES) {
        test(`${path} in every language: fits, no serious a11y issues, no console errors`, async ({ page }) => {
          const errors = watchConsole(page);
          for (const prefix of PREFIXES) {
            await test.step(at(prefix, path), async () => {
              await page.goto(at(prefix, path));
              await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
              await page.waitForLoadState('networkidle');
              expect.soft(await overflows(page), `overflow on ${at(prefix, path)}`).toEqual([]);
              expect.soft(await seriousAxe(page), `axe on ${at(prefix, path)}`).toEqual([]);
            });
          }
          expect(errors).toEqual([]);
        });
      }
    });
  }

  test(`desktop (1440px), ${theme}: every page fits and passes axe`, async ({ page, context, baseURL }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await context.addCookies([{ name: 'yoyo-theme', value: theme, url: baseURL! }]);
    const errors = watchConsole(page);
    for (const path of PAGES) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      expect.soft(await overflows(page), path).toEqual([]);
      expect.soft(await seriousAxe(page), path).toEqual([]);
    }
    expect(errors).toEqual([]);
  });
}

test.describe('reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('nothing moves on the landing page, even after scrolling to the end', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  });

  test('moving to another page is instant, without a View Transition', async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __vt: number }).__vt = 0;
      const original = document.startViewTransition?.bind(document);
      if (original) {
        document.startViewTransition = ((update: () => Promise<void>) => {
          (window as unknown as { __vt: number }).__vt += 1;
          return original(update);
        }) as typeof document.startViewTransition;
      }
    });
    await page.goto('/');
    await page.getByRole('contentinfo').getByRole('link', { name: en.footer.links.terms }).click();
    await expect(page).toHaveURL(/\/terms$/);
    expect(await page.evaluate(() => (window as unknown as { __vt: number }).__vt)).toBe(0);
  });
});

test('moving between pages is one View Transition that cleans up after itself, and Back works', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __vt: number }).__vt = 0;
    const original = document.startViewTransition.bind(document);
    document.startViewTransition = ((update: () => Promise<void>) => {
      (window as unknown as { __vt: number }).__vt += 1;
      return original(update);
    }) as typeof document.startViewTransition;
  });
  await page.goto('/');
  await page.getByRole('contentinfo').getByRole('link', { name: en.footer.links.faq }).click();
  await expect(page).toHaveURL(/\/faq$/);
  await expect(page.getByRole('heading', { level: 1, name: en.faq.title })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __vt: number }).__vt)).toBe(1);
  await expect(page.locator('html')).not.toHaveAttribute('data-page-switch');
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Yoyo' })).toBeVisible();
});

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
]) {
  test(`the landing page does not shift while it loads and scrolls (${viewport.width}px)`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.addInitScript(() => {
      (window as unknown as { __cls: number }).__cls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
          if (!entry.hadRecentInput) (window as unknown as { __cls: number }).__cls += entry.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    for (let y = 0; y < 12; y += 1) {
      await page.mouse.wheel(0, 700);
      await page.waitForTimeout(80);
    }
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => (window as unknown as { __cls: number }).__cls)).toBeLessThan(0.02);
  });
}

test('every link on the new pages leads somewhere', async ({ page, request }) => {
  const seen = new Set<string>();
  for (const prefix of PREFIXES) {
    for (const path of PAGES) {
      await page.goto(at(prefix, path));
      const hrefs = await page
        .locator('a[href^="/"]')
        .evaluateAll((links) => links.map((link) => (link.getAttribute('href') ?? '').split('#')[0]!));
      hrefs.forEach((href) => seen.add(href || '/'));
    }
  }
  const broken: string[] = [];
  for (const href of seen) {
    const response = await request.get(href, { maxRedirects: 3 });
    if (response.status() >= 400) broken.push(`${href} → ${response.status()}`);
  }
  expect(broken).toEqual([]);
});
