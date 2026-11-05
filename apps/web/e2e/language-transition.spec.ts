import { devices, expect, test, type Page } from '@playwright/test';

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
      const run: Recorded = { captures: [], frames: [], animations: null, elapsed: null };
      w.__vt.push(run);
      // The browser captures the old page on the next frame, as it is now.
      run.captures.push({ at: 'old', x: scrollX, y: scrollY, ...header() });
      const started = performance.now();
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
          // From here on the transition is on the screen (before, the browser shows the old page frozen).
          requestAnimationFrame(tick);
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
      transition.finished
        .catch(() => {})
        .finally(() => {
          done = true;
          run.elapsed = performance.now() - started;
        });
      return transition;
    }) as typeof document.startViewTransition;
  });
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
  expect(run.elapsed).not.toBeNull();
  expect(run.elapsed!).toBeLessThan(1500);
}

test('at the top of a page: the header stays still while the language changes', async ({ page }) => {
  await recordTransitions(page);
  await page.goto('/login');
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => typeof document.startViewTransition)).toBe('function');

  await switchTo(page, 'Language', 'Русский');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await expect(page.locator('html')).not.toHaveAttribute('data-language-switch');
  await switchTo(page, 'Язык', 'Latviešu');
  await expect(page.locator('html')).toHaveAttribute('lang', 'lv');
  await expect(page.locator('html')).not.toHaveAttribute('data-language-switch');

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
  await page.evaluate(() => document.fonts.ready);
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
  await expect(page.locator('html')).not.toHaveAttribute('data-language-switch');

  const [run] = await recorded(page);
  expectStill(run!);
  expect(run!.captures[0]!.y).toBe(bottom);
  // Still where the visitor was once it is over: the page only gets shorter once that is out of sight.
  expect(await page.evaluate(() => scrollY)).toBe(bottom);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.locator('html')).not.toHaveAttribute('style', /min-height/);
});
