import { expect, test, type Page } from '@playwright/test';
import en from '../messages/en.json' with { type: 'json' };
import lv from '../messages/lv.json' with { type: 'json' };
import ru from '../messages/ru.json' with { type: 'json' };
import { overflows } from './support/layout';

/**
 * The language switch is one smooth View Transition (switch-language.ts): the right page and address
 * every time, even switched quickly in a row; the new page is what the browser captures (no flash of
 * the old language); reduced motion and browsers without View Transitions switch at once.
 */
const LANGUAGES = {
  en: { prefix: '', name: 'English', m: en },
  lv: { prefix: '/lv', name: 'Latviešu', m: lv },
  ru: { prefix: '/ru', name: 'Русский', m: ru },
} as const;
type Lang = keyof typeof LANGUAGES;
const ROUND: Lang[] = ['lv', 'ru', 'en'];

/** Counts the View Transitions and records what the page shows when the browser captures the new one. */
async function watchTransitions(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __vt: { started: number; captured: { lang: string; h1: string }[] } };
    w.__vt = { started: 0, captured: [] };
    const original = document.startViewTransition?.bind(document);
    if (!original) return;
    document.startViewTransition = ((update: () => Promise<void>) => {
      w.__vt.started += 1;
      const transition = original(update);
      transition.updateCallbackDone.then(
        () =>
          w.__vt.captured.push({
            lang: document.documentElement.lang,
            h1: document.querySelector('h1')?.textContent ?? '',
          }),
        () => {},
      );
      return transition;
    }) as typeof document.startViewTransition;
  });
}

const transitions = (page: Page) =>
  page.evaluate(
    () => (window as unknown as { __vt: { started: number; captured: { lang: string; h1: string }[] } }).__vt,
  );

/** The language pill of the header in `lang`. */
const languagePill = (page: Page, lang: Lang) =>
  page
    .locator('[data-site-header]')
    .getByRole('button', { name: new RegExp(`^${LANGUAGES[lang].m.language.label}: `) });

/** Opens the language menu and picks `to`. */
async function choose(page: Page, from: Lang, to: Lang) {
  await languagePill(page, from).click();
  await page.locator('[data-site-header]').getByRole('menuitemradio', { name: LANGUAGES[to].name }).click();
}

async function expectPage(page: Page, lang: Lang, path: string) {
  const { prefix, m } = LANGUAGES[lang];
  await expect(page).toHaveURL(new RegExp(`^[^?]+//[^/]+${prefix}${path.replace(/[?]/g, '\\?')}$`));
  await expect(page.locator('html')).toHaveAttribute('lang', lang);
  await expect(page.getByRole('heading', { level: 1, name: m.auth.login.title })).toBeVisible();
  // The animation state is cleaned up once the transition ends.
  await expect(page.locator('html')).not.toHaveAttribute('data-language-switch');
}

for (const width of [390, 1280]) {
  test.describe(`at ${width}px`, () => {
    test.use({ viewport: { width, height: 800 } });

    test('en -> lv -> ru -> en, three rounds in a row: right texts and address, nothing sticks out', async ({
      page,
    }) => {
      await watchTransitions(page);
      const path = '/login?next=%2Fsettings';
      await page.goto(path);
      await expectPage(page, 'en', path);

      let from: Lang = 'en';
      for (let round = 0; round < 3; round += 1) {
        for (const to of ROUND) {
          await choose(page, from, to);
          await expectPage(page, to, path);
          expect(await overflows(page)).toEqual([]);
          // The keyboard focus is back on the switcher, not lost on the page.
          await expect(languagePill(page, to)).toBeFocused();
          from = to;
        }
      }

      const { started, captured } = await transitions(page);
      expect(started).toBe(9);
      // What the browser captured as "new" was already the new language every time.
      expect(captured.map(({ lang }) => lang)).toEqual([...ROUND, ...ROUND, ...ROUND]);
      expect(captured.map(({ h1 }) => h1)).toEqual(
        [...ROUND, ...ROUND, ...ROUND].map((lang) => LANGUAGES[lang].m.auth.login.title),
      );
    });
  });
}

test('with reduced motion the language changes at once, without a transition', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await watchTransitions(page);
  await page.goto('/login');
  await choose(page, 'en', 'lv');
  await expectPage(page, 'lv', '/login');
  await choose(page, 'lv', 'en');
  await expectPage(page, 'en', '/login');
  expect((await transitions(page)).started).toBe(0);
});

test('a browser without View Transitions switches at once and is never left half-way', async ({ page }) => {
  await page.addInitScript(() => {
    Reflect.deleteProperty(Document.prototype, 'startViewTransition');
  });
  await page.goto('/ru/login?next=%2Fsettings');
  expect(await page.evaluate(() => typeof document.startViewTransition)).toBe('undefined');
  await choose(page, 'ru', 'lv');
  await expectPage(page, 'lv', '/login?next=%2Fsettings');
  await choose(page, 'lv', 'en');
  await expectPage(page, 'en', '/login?next=%2Fsettings');
});
