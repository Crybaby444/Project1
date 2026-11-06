import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import en from '../messages/en.json' with { type: 'json' };
import lv from '../messages/lv.json' with { type: 'json' };
import ru from '../messages/ru.json' with { type: 'json' };
import { overflows } from './support/layout';

/**
 * The language control is one compact pill (EN / LV / RU) at every width that opens a small menu of
 * the three languages: it fits a 320px phone in both themes, animates in and out (scale and fade from
 * the pill, 180–250 ms, none with reduced motion), and works with the keyboard, a mouse and touch.
 */
const MESSAGES = { en, lv, ru } as const;
type Lang = keyof typeof MESSAGES;

const pill = (page: Page, lang: Lang = 'en') =>
  page
    .locator('[data-site-header]')
    .getByRole('button', { name: new RegExp(`^${MESSAGES[lang].language.label}: `) });
const menu = (page: Page) => page.locator('[data-site-header]').getByRole('menu');

async function setTheme(page: Page, theme: 'light' | 'dark') {
  await page.context().addCookies([{ name: 'yoyo-theme', value: theme, url: 'http://localhost:3000' }]);
}

/** Durations of the animations running on the menu right now. */
const menuAnimations = (page: Page) =>
  menu(page).evaluate((el) => el.getAnimations().map((a) => Number(a.effect?.getTiming().duration)));

type AnimationLog = { menuAnimations: number[] };

/**
 * Records the duration of every animation started on the menu from now on. Reading the running
 * animations afterwards races them on a busy machine: the 180 ms close can be over (and the menu
 * hidden) before the test looks.
 */
const recordMenuAnimations = (page: Page) =>
  page.evaluate(() => {
    const log = window as unknown as AnimationLog;
    log.menuAnimations = [];
    const original = Element.prototype.animate;
    Element.prototype.animate = function (this: Element, ...args: Parameters<Element['animate']>) {
      if (this.matches('[data-site-header] [role="menu"]')) {
        const timing = args[1];
        log.menuAnimations.push(Number(typeof timing === 'number' ? timing : timing?.duration));
      }
      return original.apply(this, args);
    };
  });

/** The durations recorded since the last call. */
const takeMenuAnimations = (page: Page) =>
  page.evaluate(() => {
    const log = window as unknown as AnimationLog;
    const taken = log.menuAnimations;
    log.menuAnimations = [];
    return taken;
  });

test.describe('at 320px', () => {
  test.use({ viewport: { width: 320, height: 640 } });

  for (const theme of ['light', 'dark'] as const) {
    for (const lang of ['en', 'lv', 'ru'] as const) {
      test(`${lang}, ${theme}: the pill and its open menu stay on the screen`, async ({ page }) => {
        await setTheme(page, theme);
        await page.goto(lang === 'en' ? '/login' : `/${lang}/login`);
        const button = pill(page, lang);
        const box = (await button.boundingBox())!;
        expect(box.width).toBeLessThanOrEqual(48); // a 40px touch target, no wide control
        expect(box.height).toBeGreaterThanOrEqual(40);

        await button.click();
        await expect(menu(page)).toBeVisible();
        await expect(menu(page).getByRole('menuitemradio')).toHaveCount(3);
        const open = (await menu(page).boundingBox())!;
        expect(open.x).toBeGreaterThanOrEqual(8);
        expect(open.x + open.width).toBeLessThanOrEqual(320 - 8);
        expect(await overflows(page)).toEqual([]);

        const axe = await new AxeBuilder({ page }).include('[data-site-header]').analyze();
        expect(axe.violations).toEqual([]);
      });
    }
  }
});

test.describe('on a desktop', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('the header shows a small pill, not a wide segmented control', async ({ page }) => {
    await page.goto('/login');
    await expect(pill(page)).toBeVisible();
    expect((await pill(page).boundingBox())!.width).toBeLessThanOrEqual(96);
    await expect(page.locator('[data-site-header]').getByRole('menuitemradio')).toHaveCount(0);
    // The links are in the HTML (crawlers, before hydration): hreflang and lang, never prefetched.
    const links = page.locator('[data-site-header] [role="menuitemradio"]');
    await expect(links).toHaveCount(3);
    for (const [index, lang] of (['en', 'lv', 'ru'] as const).entries()) {
      await expect(links.nth(index)).toHaveAttribute('hreflang', lang);
      await expect(links.nth(index)).toHaveAttribute('lang', lang);
    }
  });

  test('the menu scales and fades in from the pill and out again', async ({ page }) => {
    await page.goto('/login');
    await recordMenuAnimations(page);
    await pill(page).click();
    await expect(menu(page)).toBeVisible();
    const opening = await takeMenuAnimations(page);
    expect(opening).toHaveLength(1);
    expect(opening[0]).toBeGreaterThanOrEqual(180);
    expect(opening[0]).toBeLessThanOrEqual(250);
    await page.mouse.click(1000, 600);
    await expect(pill(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(menu(page)).toBeHidden();
    const closing = await takeMenuAnimations(page);
    expect(closing).toHaveLength(1);
    expect(closing[0]).toBeGreaterThanOrEqual(180);
    expect(closing[0]).toBeLessThanOrEqual(250);
  });

  test('with reduced motion it opens and closes at once', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/login');
    await pill(page).click();
    await expect(menu(page)).toBeVisible();
    expect(await menuAnimations(page)).toEqual([]);
  });

  test('keyboard: open, arrows, type-ahead, Escape back on the pill, Enter switches', async ({ page }) => {
    await page.goto('/login?next=%2Fsettings');
    await pill(page).focus();
    await page.keyboard.press('Enter');
    await expect(menu(page).getByRole('menuitemradio', { name: 'English' })).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(menu(page).getByRole('menuitemradio', { name: 'Latviešu' })).toBeFocused();
    await page.keyboard.press('End');
    await expect(menu(page).getByRole('menuitemradio', { name: 'Русский' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(menu(page)).toBeHidden();
    await expect(pill(page)).toBeFocused();

    await page.keyboard.press('ArrowDown');
    await page.keyboard.type('l');
    await expect(menu(page).getByRole('menuitemradio', { name: 'Latviešu' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/lv\/login\?next=%2Fsettings$/);
    await expect(pill(page, 'lv')).toBeFocused();
  });
});

test.describe('on a touch phone', () => {
  test.use({ viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true });

  test('a tap opens the menu, a tap outside closes it, a tap on a language switches', async ({ page }) => {
    await page.goto('/ru/login');
    await pill(page, 'ru').tap();
    await expect(menu(page)).toBeVisible();
    await page.locator('main').tap({ position: { x: 20, y: 300 } });
    await expect(menu(page)).toBeHidden();
    await pill(page, 'ru').tap();
    await menu(page).getByRole('menuitemradio', { name: 'English' }).tap();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
});
