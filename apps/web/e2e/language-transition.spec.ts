import { devices, expect, test, type Page } from '@playwright/test';
import { fontsReady } from './support/layout';

/**
 * The language switch must look deliberate on an iPhone (WebKit project in playwright.config.ts) and
 * in Chromium: the header stays perfectly still, both pages are captured at the same scroll position,
 * nothing in the transition moves or resizes, and it lasts 400–500 ms.
 */

// iPhone 15 (390 px wide, touch) in whichever browser runs this: WebKit or Chromium.
const iPhone = { ...devices['iPhone 15'] } as Partial<(typeof devices)['iPhone 15']>;
delete iPhone.defaultBrowserType; // the project picks the browser
test.use(iPhone);

type Box = { top: number; left: number; width: number; height: number };
type Recorded = {
  captures: ({ at: 'old' | 'new'; x: number; y: number } & Box)[];
  frames: ({ y: number } & Box)[];
  animations: { pseudo: string; end: number; transform: boolean }[] | null;
  /** Delay + duration of each part, as the CSS sets them (every engine computes these the same). */
  timing: Record<string, number>;
  /** How long the transition played on the screen, from `ready` (both pages captured) to its end. */
  elapsed: number | null;
};

/** Records the header box and the scroll position at both captures and on every frame it plays. */
async function recordTransitions(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __vt: Recorded[] };
    w.__vt = [];
    const original = document.startViewTransition?.bind(document);
    if (!original) return;
    const header = () => {
      const r = document.querySelector('[data-site-header]')!.getBoundingClientRect();
      return { top: r.top, left: r.left, width: r.width, height: r.height };
    };
    document.startViewTransition = ((update: () => Promise<void>) => {
      const run: Recorded = { captures: [], frames: [], animations: null, timing: {}, elapsed: null };
      w.__vt.push(run);
      // The browser captures the old page on the next frame, as it is now.
      run.captures.push({ at: 'old', x: scrollX, y: scrollY, ...header() });
      let started: number | null = null;
      const transition = original(async () => {
        await update();
        run.captures.push({ at: 'new', x: scrollX, y: scrollY, ...header() });
      });
      let done = false;
      const tick = () => {
        if (done) return;
        run.frames.push({ y: scrollY, ...header() });
        requestAnimationFrame(tick);
      };
      transition.ready
        .then(() => {
          started = performance.now();
          // From here on the transition is on the screen (before, the browser shows the old page frozen).
          requestAnimationFrame(tick);
          const ms = (value: string) =>
            Math.max(
              ...value
                .split(',')
                .map((v) => (v.trim().endsWith('ms') ? parseFloat(v) : parseFloat(v) * 1000)),
            );
          for (const part of ['old', 'new']) {
            for (const name of ['root', 'site-header']) {
              const pseudo = `::view-transition-${part}(${name})`;
              const style = getComputedStyle(document.documentElement, pseudo);
              run.timing[pseudo] = ms(style.animationDelay) + ms(style.animationDuration);
            }
          }
          const pseudo = document
            .getAnimations()
            .filter((a) =>
              (a.effect as KeyframeEffect | null)?.pseudoElement?.startsWith('::view-transition'),
            );
          if (pseudo.length === 0) return; // this browser does not list them
          run.animations = pseudo.map((a) => {
            const effect = a.effect as KeyframeEffect;
            return {
              pseudo: effect.pseudoElement!,
              end: Number(effect.getComputedTiming().endTime),
              transform: effect.getKeyframes().some((k) => 'transform' in k || 'width' in k || 'height' in k),
            };
          });
        })
        .catch(() => {});
      // Stops on the very hop the transition ends, before the page's own clean-up lets the test go on
      // (else a scroll Playwright makes for its next click could land in this recording).
      const end = () => {
        done = true;
        run.elapsed = started === null ? 0 : performance.now() - started;
      };
      transition.finished.then(end, end);
      return transition;
    }) as typeof document.startViewTransition;
  });
}

/** Waits until the last transition is over and its recording closed. */
async function transitionEnded(page: Page) {
  await expect(page.locator('html')).not.toHaveAttribute('data-language-switch');
  await page.waitForFunction(() => (window as unknown as { __vt: Recorded[] }).__vt.at(-1)?.elapsed != null);
}

const recorded = (page: Page) => page.evaluate(() => (window as unknown as { __vt: Recorded[] }).__vt);

async function switchTo(page: Page, from: string, to: string) {
  await page
    .locator('[data-site-header]')
    .getByRole('button', { name: new RegExp(`^${from}: `) })
    .click();
  await page.locator('[data-site-header]').getByRole('menuitemradio', { name: to }).click();
}

function expectStill(run: Recorded) {
  const [old, now] = run.captures;
  expect(old?.at).toBe('old');
  expect(now?.at).toBe('new');
  // The same scroll position for both captures…
  expect(now!.y).toBe(old!.y);
  expect(now!.x).toBe(old!.x);
  // …and the header exactly where it was, on every frame of the transition.
  const box = ({ top, left, width, height }: Box) => ({ top, left, width, height });
  expect(box(now!)).toEqual(box(old!));
  expect(run.frames.length).toBeGreaterThan(0);
  for (const frame of run.frames) {
    expect(box(frame)).toEqual(box(old!));
    expect(frame.y).toBe(old!.y);
  }
  if (run.animations) {
    // Nothing in the transition moves or resizes; the longest part ends at 400–500 ms.
    expect(run.animations.filter((a) => a.pseudo.includes('-group(') || a.transform)).toEqual([]);
    // The page and the header's words cross-fade.
    expect(run.animations.map((a) => a.pseudo).sort()).toEqual([
      '::view-transition-new(root)',
      '::view-transition-new(site-header)',
      '::view-transition-old(root)',
      '::view-transition-old(site-header)',
    ]);
    const end = Math.max(...run.animations.map((a) => a.end));
    expect(end).toBeGreaterThanOrEqual(400);
    expect(end).toBeLessThanOrEqual(500);
  }
  // What the CSS plays, whatever the machine: the longest part ends at 400–500 ms.
  const longest = Math.max(...Object.values(run.timing));
  expect(longest).toBeGreaterThanOrEqual(400);
  expect(longest).toBeLessThanOrEqual(500);
  expect(run.timing['::view-transition-old(site-header)']).toBe(
    run.timing['::view-transition-new(site-header)'],
  );
  expect(run.elapsed).not.toBeNull();
  // It ends: on a slow machine late, but never left running (switch-language.ts skips it after 1.5 s).
  expect(run.elapsed!).toBeLessThan(2500);
}

test('at the top of a page: the header stays still while the language changes', async ({ page }) => {
  await recordTransitions(page);
  await page.goto('/login');
  await fontsReady(page);
  expect(await page.evaluate(() => typeof document.startViewTransition)).toBe('function');

  await switchTo(page, 'Language', 'Русский');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await transitionEnded(page);
  await switchTo(page, 'Язык', 'Latviešu');
  await expect(page.locator('html')).toHaveAttribute('lang', 'lv');
  await transitionEnded(page);

  const runs = await recorded(page);
  expect(runs).toHaveLength(2);
  runs.forEach(expectStill);
});

test('at the bottom of a long page, to a shorter one: same scroll for both captures, no jump after', async ({
  page,
}) => {
  await recordTransitions(page);
  // The style guide is taller in Russian than in English at 390 px.
  await page.goto('/ru/styleguide');
  await fontsReady(page);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const bottom = await page.evaluate(() => scrollY);
  expect(bottom).toBeGreaterThan(400);

  // With the keyboard, so nothing scrolls the header into view first.
  await page
    .locator('[data-site-header] button[aria-haspopup="menu"]')
    .evaluate((el) => (el as HTMLElement).focus({ preventScroll: true }));
  await page.keyboard.press('Enter');
  await page.keyboard.press('Home');
  await page.keyboard.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await transitionEnded(page);

  const [run] = await recorded(page);
  expectStill(run!);
  expect(run!.captures[0]!.y).toBe(bottom);
  // Still where the visitor was once it is over: the page only gets shorter once that is out of sight.
  expect(await page.evaluate(() => scrollY)).toBe(bottom);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.locator('html')).not.toHaveAttribute('style', /min-height/);
});
