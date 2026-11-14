import { expect, test, type Page } from '@playwright/test';
import en from '../messages/en.json' with { type: 'json' };
import lv from '../messages/lv.json' with { type: 'json' };
import ru from '../messages/ru.json' with { type: 'json' };
import { overflows } from './support/layout';

/**
 * Smoke tests for the motion system (components/motion, styles/motion.css): pages render with motion
 * on and with reduced motion, scroll-linked effects respond to the scroll, and nothing leaves a page
 * wider than a phone. The styleguide's Motion section shows every technique at once.
 */

const LOCALES = [
  { prefix: '', m: en },
  { prefix: '/lv', m: lv },
  { prefix: '/ru', m: ru },
] as const;

/** Collects page errors and console errors, so a broken animation script fails the test. */
function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    // The styleguide's live API badge may log a failed request when the API is still waking up.
    if (message.type() === 'error' && !message.text().includes('Failed to load resource'))
      errors.push(message.text());
  });
  return errors;
}

async function scrollToMiddleOf(page: Page, id: string) {
  await page.evaluate((id) => {
    const box = document.getElementById(id)!.closest('[data-tone-section]')!.getBoundingClientRect();
    window.scrollTo(0, window.scrollY + box.top + box.height / 2 - window.innerHeight / 2);
  }, id);
}

async function styleguideAvailable(page: Page, path: string): Promise<boolean> {
  return (await page.goto(path))?.status() === 200;
}

test.describe('motion on', () => {
  test('section colours morph, words fill and marquee rows run as the page scrolls', async ({ page }) => {
    const errors = watchErrors(page);
    test.skip(!(await styleguideAvailable(page, '/styleguide')), 'styleguide is off in this build');

    const mintLayer = page.locator('#motion-words').locator('xpath=..').locator('[data-tone-layer]');
    expect(Number(await mintLayer.evaluate((el) => getComputedStyle(el).opacity))).toBeLessThan(0.1);

    await scrollToMiddleOf(page, 'motion-words');
    await expect
      .poll(async () => Number(await mintLayer.evaluate((el) => getComputedStyle(el).opacity)))
      .toBeGreaterThan(0.9);

    // Past the statement, every word is ink.
    await scrollToMiddleOf(page, 'motion-stickers');
    await expect
      .poll(async () =>
        Math.min(
          ...(await page
            .locator('[data-word-fill] [data-word]')
            .evaluateAll((words) => words.map((word) => Number(getComputedStyle(word).opacity)))),
        ),
      )
      .toBeGreaterThan(0.99);

    await scrollToMiddleOf(page, 'motion-marquee');
    const track = page.locator('[data-marquee-row-track]').first();
    await expect(track).toHaveAttribute('data-in-view', '');
    expect(await track.evaluate((el) => getComputedStyle(el).animationPlayState)).toBe('running');

    expect(errors).toEqual([]);
  });

  for (const { prefix, m } of LOCALES) {
    for (const width of [320, 390]) {
      test(`styleguide motion ${prefix || '/'} fits ${width}px all the way down`, async ({ page }) => {
        await page.setViewportSize({ width, height: 740 });
        test.skip(
          !(await styleguideAvailable(page, `${prefix}/styleguide`)),
          'styleguide is off in this build',
        );
        await expect(page.getByRole('heading', { level: 2, name: m.styleguide.motion.title })).toBeVisible();
        for (const id of [
          'motion-words',
          'motion-steps',
          'motion-stickers',
          'motion-marquee',
          'motion-bento',
        ]) {
          await scrollToMiddleOf(page, id);
          expect.soft(await overflows(page), `${id} at ${width}px`).toEqual([]);
        }
      });
    }
  }

  test('the hero letters rise in, and the auth card and its title animate in', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Yoyo' })).toBeVisible();
    expect(
      await page
        .locator('[data-letter]')
        .first()
        .evaluate((el) => getComputedStyle(el).animationName),
    ).toBe('letter-in');

    await page.goto('/login');
    await expect(page.getByRole('heading', { level: 1, name: en.auth.login.title })).toBeVisible();
    expect(await page.locator('[data-letter]').count()).toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });

  test('the v16 home under automation is its plain sections: every scene, nothing staged, no errors', async ({ page }) => {
    // The WebGL stage skips itself under navigator.webdriver (CI has no GPU); its motion is checked by eye.
    const errors = watchErrors(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    for (const scene of ['hero', 'night', 'what', 'facts', 'finale']) {
      await expect(page.locator(`[data-home="${scene}"]`)).toBeVisible();
    }
    expect(await page.evaluate(() => document.documentElement.hasAttribute('data-staged'))).toBe(false);
    expect(errors).toEqual([]);
  });


  test('during a language or page switch nothing on the new page moves (the transition stays geometry-free)', async ({
    page,
  }) => {
    await page.goto('/login');
    const running = () =>
      page
        .locator('[data-card-rise], [data-rise-word], [data-letter], [data-bob]')
        .evaluateAll((els) => els.map((el) => getComputedStyle(el).animationName));
    // A normal load plays the card rise and the title (v16: no floating sticker any more).
    expect(await running()).toContain('card-rise');
    for (const attribute of ['data-language-switch', 'data-page-switch']) {
      await page.evaluate((name) => document.documentElement.setAttribute(name, ''), attribute);
      expect(new Set(await running())).toEqual(new Set(['none']));
      await page.evaluate((name) => document.documentElement.removeAttribute(name), attribute);
    }
  });

  test('load animations play once, on a fresh load, and never replay after a language switch', async ({
    page,
  }) => {
    await page.goto('/login');
    const card = page.locator('[data-card-rise]');
    expect(await card.evaluate((el) => getComputedStyle(el).animationName)).toBe('card-rise');
    await page
      .locator('[data-site-header]')
      .getByRole('button', { name: new RegExp(`^${en.language.label}: `) })
      .click();
    await page.locator('[data-site-header]').getByRole('menuitemradio', { name: 'Latviešu' }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'lv');
    await expect(page.locator('html')).not.toHaveAttribute('data-language-switch');
    // The new page's card and title are simply there: nothing restarts as the switch ends.
    expect(await card.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
    expect(
      new Set(
        await page
          .locator('[data-letter], [data-rise-word]')
          .evaluateAll((els) => els.map((el) => getComputedStyle(el).animationName)),
      ),
    ).toEqual(new Set(['none']));
  });

  test('the auth title is in the page once, so a field with the same name stays unique', async ({ page }) => {
    await page.goto('/reset-password?token=abc');
    await expect(page.getByRole('heading', { level: 1, name: en.auth.reset.title })).toBeVisible();
    expect(await page.locator('h1').evaluate((el) => el.textContent)).toBe(en.auth.reset.title);
    await expect(page.getByLabel(en.auth.fields.newPassword, { exact: true })).toHaveCount(1);
  });
});

test.describe('reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('the styleguide motion section is still and fully readable', async ({ page }) => {
    const errors = watchErrors(page);
    test.skip(!(await styleguideAvailable(page, '/styleguide')), 'styleguide is off in this build');

    // Section colours are flat bands instead of fixed layers that fade.
    const section = page.locator('#motion-words').locator('xpath=..');
    expect(await section.locator('[data-tone-layer]').evaluate((el) => getComputedStyle(el).display)).toBe(
      'none',
    );
    expect(await section.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');

    // Every word is ink before any scrolling.
    const opacities = await page
      .locator('[data-word-fill] [data-word]')
      .evaluateAll((words) => words.map((word) => Number(getComputedStyle(word).opacity)));
    expect(Math.min(...opacities)).toBe(1);

    // Cards are an ordinary list, nothing pins.
    expect(
      await page
        .locator('[data-stack-item]')
        .first()
        .evaluate((el) => getComputedStyle(el).position),
    ).toBe('static');

    // Marquee rows wrap into a still block without the duplicate copy, and no pause button is needed.
    const track = page.locator('[data-marquee-row-track]').first();
    expect(await track.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
    await expect(page.locator('[data-marquee-copy]').first()).toBeHidden();

    // Parallax layers do not drift.
    expect(
      await page
        .locator('[data-parallax-layer]')
        .first()
        .evaluate((el) => getComputedStyle(el).translate),
    ).toBe('none');
    expect(errors).toEqual([]);
  });

  test('the home is still: not staged, every word of the statement fully there', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    expect(await page.evaluate(() => document.documentElement.hasAttribute('data-staged'))).toBe(false);
    const words = await page
      .locator('[data-home="what"] [data-word]')
      .evaluateAll((list) => list.map((word) => Number(getComputedStyle(word).opacity)));
    expect(Math.min(...words)).toBe(1);
    expect(errors).toEqual([]);
  });


  test('home and sign-in render with the letters already in place', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Yoyo' })).toBeVisible();
    expect(
      await page
        .locator('[data-letter]')
        .first()
        .evaluate((el) => getComputedStyle(el).animationName),
    ).toBe('none');
    await page.goto('/login');
    await expect(page.getByRole('heading', { level: 1, name: en.auth.login.title })).toBeVisible();
    expect(
      await page
        .locator('[data-letter]')
        .first()
        .evaluate((el) => getComputedStyle(el).opacity),
    ).toBe('1');
    expect(errors).toEqual([]);
  });
});
