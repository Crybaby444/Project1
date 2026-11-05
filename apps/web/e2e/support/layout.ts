import type { Page } from '@playwright/test';

type Overflow = { what: string; scrollWidth: number; clientWidth: number };

/**
 * Waits for the web fonts, so text is measured at its final width. Returns a plain value (WebKit never
 * settled an evaluate that handed back the FontFaceSet itself) and gives up after a few seconds.
 */
export async function fontsReady(page: Page): Promise<void> {
  await page.evaluate(() =>
    Promise.race([
      document.fonts.ready.then(() => true),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 3000)),
    ]),
  );
}

/** Every horizontal overflow on the page: the page itself, any h1, any display-face text. */
export async function overflows(page: Page): Promise<Overflow[]> {
  await fontsReady(page);
  return page.evaluate(() => {
    const found: { what: string; scrollWidth: number; clientWidth: number }[] = [];
    const root = document.documentElement;
    if (root.scrollWidth > window.innerWidth) {
      // Name the innermost elements that stick out past the right edge, so a failure says what to fix.
      const clipped = (el: HTMLElement) => {
        for (let up = el.parentElement; up && up !== document.body; up = up.parentElement) {
          if (getComputedStyle(up).overflowX !== 'visible') return true;
        }
        return false;
      };
      const out = [...document.body.querySelectorAll<HTMLElement>('*')].filter(
        (el) => el.getBoundingClientRect().right > window.innerWidth + 0.5 && !clipped(el),
      );
      const culprits = out
        .filter((el) => !out.some((other) => other !== el && el.contains(other)))
        .slice(0, 3)
        .map(
          (el) =>
            `<${el.tagName.toLowerCase()}> "${el.textContent?.replace(/\s+/g, ' ').trim().slice(0, 40)}"`,
        );
      found.push({
        what: `page (sticking out: ${culprits.join(', ')})`,
        scrollWidth: root.scrollWidth,
        clientWidth: window.innerWidth,
      });
    }
    for (const el of document.querySelectorAll<HTMLElement>('h1, .font-display')) {
      // Inline display text (the wordmark inside the hero h1) is measured through its block.
      if (getComputedStyle(el).display === 'inline') continue;
      if (el.scrollWidth > el.clientWidth) {
        const what = `<${el.tagName.toLowerCase()}> "${el.innerText.replace(/\s+/g, ' ').trim()}"`;
        found.push({ what, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth });
      }
    }
    return found;
  });
}
