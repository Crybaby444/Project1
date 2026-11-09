import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { asOwnVisitor, registerByApi } from './support/accounts';
import { publishListing, uniqueWord, type Published } from './support/catalog';
import { overflows } from './support/layout';
import { serveBlankMapTiles } from './support/listings';

/**
 * The catalog's screens wherever they are read: three languages, both themes, the smallest phones.
 * Nothing sticks out (long Latvian and Russian words wrap), axe finds nothing serious, the console stays
 * clean; and with reduced motion the heart does not pop.
 */
const PREFIXES = ['', '/lv', '/ru'] as const;
const CATEGORY = { '': 'tools', '/lv': 'instrumenti', '/ru': 'instrumenty' } as const;

async function seriousAxe(page: Page): Promise<string[]> {
  const { violations } = await new AxeBuilder({ page }).exclude('.leaflet-container').analyze();
  return violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target.join(' ')}`);
}

/** Console errors, each prefixed with the address it happened on. */
function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  const where = () => new URL(page.url()).pathname + new URL(page.url()).search;
  page.on('pageerror', (error) => errors.push(`${where()}: ${error.message}`));
  page.on('console', (message) => message.type() === 'error' && errors.push(`${where()}: ${message.text()}`));
  return errors;
}

let item: Published;

test.beforeAll(async ({ browser }) => {
  // A long Latvian title: it must wrap on a 320px phone, not push the page sideways.
  item = await publishListing(browser, {
    title: `Akumulatora triecienurbjmašīna ar divām baterijām un koferi ${uniqueWord('lv')}`,
    fields: { contentLocale: 'lv' },
  });
});

test.beforeEach(async ({ context }) => {
  await asOwnVisitor(context);
});

for (const theme of ['light', 'dark'] as const) {
  for (const width of [320, 390]) {
    test.describe(`${theme} at ${width}px`, () => {
      test.use({ viewport: { width, height: 800 } });
      test.beforeEach(async ({ context, baseURL }) => {
        await context.addCookies([{ name: 'yoyo-theme', value: theme, url: baseURL! }]);
      });

      test('catalog, category, search, map, item and profile: fit, accessible, no console errors', async ({ page }) => {
        test.setTimeout(180_000); // 18 pages, each checked by axe
        const errors = watchConsole(page);
        await serveBlankMapTiles(page);
        for (const prefix of PREFIXES) {
          const paths = [
            `${prefix}/c`,
            `${prefix}/c/${CATEGORY[prefix]}`,
            `${prefix}/search?q=${encodeURIComponent('urbjmašīna')}`,
            `${prefix}/search?q=urbj&view=map`,
            `${prefix}/listings/${item.id}-${item.slug}`,
            `${prefix}/u/${item.ownerId}`,
          ];
          for (const path of paths) {
            await test.step(path, async () => {
              await page.goto(path);
              await expect(page.locator('h1').first()).toBeVisible();
              await page.waitForLoadState('networkidle');
              expect.soft(await overflows(page), `overflow on ${path}`).toEqual([]);
              expect.soft(await seriousAxe(page), `axe on ${path}`).toEqual([]);
            });
          }
        }
        expect(errors).toEqual([]);
      });
    });
  }
}

test.describe('signed in', () => {
  test.use({ viewport: { width: 390, height: 800 } });

  test('the open catalog menu and the favourites page are accessible in both themes', async ({ page, baseURL }) => {
    await registerByApi(page.request);
    for (const theme of ['light', 'dark'] as const) {
      await page.context().addCookies([{ name: 'yoyo-theme', value: theme, url: baseURL! }]);
      await page.goto('/ru/dashboard/favorites');
      await expect(page.locator('h1')).toBeVisible();
      expect.soft(await overflows(page), `favourites, ${theme}`).toEqual([]);
      expect.soft(await seriousAxe(page), `favourites, ${theme}`).toEqual([]);
      await page.getByRole('button', { name: 'Каталог' }).click();
      await expect(page.getByRole('navigation', { name: 'Категории каталога' })).toBeVisible();
      expect.soft(await overflows(page), `menu, ${theme}`).toEqual([]);
      expect.soft(await seriousAxe(page), `menu, ${theme}`).toEqual([]);
    }
  });
});

test.describe('reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('the heart turns on without its pop and sparks', async ({ page }) => {
    await registerByApi(page.request);
    await page.goto(`/listings/${item.id}-${item.slug}`);
    const heart = page.getByRole('button', { name: /favourites/ }).first();
    await heart.click();
    await expect(heart).toHaveAttribute('aria-pressed', 'true');
    const moving = await page.evaluate(() =>
      document
        .getAnimations()
        .filter((animation) => {
          const target = (animation.effect as KeyframeEffect | null)?.target as Element | null;
          return target?.closest('button[aria-pressed]') && animation.playState === 'running';
        })
        .map((animation) => `${(animation as CSSAnimation).animationName ?? animation.id} on ${((animation.effect as KeyframeEffect).target as Element).outerHTML.slice(0, 80)}`),
    );
    expect(moving).toEqual([]);
  });
});
