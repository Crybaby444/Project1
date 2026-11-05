import { shouldAnimateThemeChange } from '@/components/theme/switch-theme';

/**
 * The language switch plays like the page refreshing for a moment (DESIGN.md sticker style): the old
 * page blurs and fades, a pastel sheet wipes across, the new language fades in; the header stays put.
 * The animation itself is CSS (globals.css, `html[data-language-switch]`), 450 ms in all.
 */

/** Same rule as the theme switch: only when motion is welcome and the browser has View Transitions. */
export const shouldAnimateLanguageChange = shouldAnimateThemeChange;

/** Longest wait for the new page before the switch stops waiting (the browser's own limit is ~4 s). */
const NEW_PAGE_TIMEOUT_MS = 3000;

/**
 * Resolves once `<html lang>` is `locale`: the router has rendered the page in the new language
 * (the layout sets `lang` in the same commit as the new texts). Gives up after `timeoutMs`.
 */
export function whenLanguageIs(locale: string, timeoutMs = NEW_PAGE_TIMEOUT_MS): Promise<void> {
  const root = document.documentElement;
  return new Promise((resolve) => {
    if (root.lang === locale) {
      resolve();
      return;
    }
    const observer = new MutationObserver(() => {
      if (root.lang === locale) done();
    });
    const timer = setTimeout(done, timeoutMs);
    function done() {
      observer.disconnect();
      clearTimeout(timer);
      resolve();
    }
    observer.observe(root, { attributes: true, attributeFilter: ['lang'] });
  });
}

/** The transition that owns `data-language-switch` right now; a quicker second switch takes it over. */
let current: object | null = null;

type SwitchLanguageOptions = {
  locale: string;
  /** Starts the client navigation to the page in `locale`. */
  navigate: () => void;
  animate: boolean;
  /** Runs once the page in the new language is there (e.g. to put the focus back on the switcher). */
  afterSwitch?: () => void;
};

/**
 * Changes the language. With `animate`, the navigation runs inside a View Transition whose update
 * waits for the new page, so the browser holds the old picture until the new language is rendered:
 * no flash of the old texts and no visible jump while the page height changes. Without it the switch
 * is instant. Either way the page is never left half-switched: a skipped transition still switches.
 */
export async function switchLanguage({
  locale,
  navigate,
  animate,
  afterSwitch,
}: SwitchLanguageOptions): Promise<void> {
  if (!animate) {
    navigate();
    await whenLanguageIs(locale);
    afterSwitch?.();
    return;
  }

  const root = document.documentElement;
  const owner = {};
  current = owner;
  root.dataset['languageSwitch'] = '';
  const transition = document.startViewTransition(async () => {
    navigate();
    await whenLanguageIs(locale);
    // React mounts the layout afresh for the new language and, taking over <html>, drops the
    // attributes it did not render: set it again before the browser captures the new page.
    if (current === owner) root.dataset['languageSwitch'] = '';
  });
  void transition.finished
    .catch(() => {})
    .finally(() => {
      if (current !== owner) return;
      current = null;
      delete root.dataset['languageSwitch'];
    });
  try {
    await transition.updateCallbackDone;
  } catch {
    // The update itself failed (e.g. the navigation threw): the router shows what it can.
  }
  afterSwitch?.();
}
