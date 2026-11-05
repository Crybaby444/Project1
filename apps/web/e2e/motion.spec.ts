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
    ).toBe('letter-rise');

    await page.goto('/login');
    await expect(page.getByRole('heading', { level: 1, name: en.auth.login.title })).toBeVisible();
    expect(await page.locator('[data-letter]').count()).toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });

  test('a page change runs as a view transition and lands on the new page', async ({ page }) => {
    const errors = watchErrors(page);
    await page.addInitScript(() => {
      const w = window as unknown as { transitions: number };
      w.transitions = 0;
      const start = document.startViewTransition?.bind(document);
      if (!start) return;
      document.startViewTransition = ((update: ViewTransitionUpdateCallback) => {
        w.transitions += 1;
        return start(update);
      }) as typeof document.startViewTransition;
    });
    await page.goto('/');
    await page.getByRole('link', { name: en.header.signIn }).first().click();
    await expect(page.getByRole('heading', { level: 1, name: en.auth.login.title })).toBeVisible();
    expect(
      await page.evaluate(() => (window as unknown as { transitions: number }).transitions),
    ).toBeGreaterThan(0);
    expect(errors).toEqual([]);
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

    // Parallax layers and tilt cards do not move.
    expect(
      await page
        .locator('[data-parallax-layer]')
        .first()
        .evaluate((el) => getComputedStyle(el).transform),
    ).toBe('none');
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
