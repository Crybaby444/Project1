import { shouldAnimateThemeChange } from '@/components/theme/switch-theme';

/**
 * The language switch is a quiet cross-fade (globals.css, `html[data-language-switch]`, 440 ms in
 * all): the header stays perfectly still and only its words change, the page fades out softly and
 * the new language settles in. Nothing moves, scales or stretches, so it looks the same in Safari
 * and Chrome. What could still jump is kept out of sight here: both pages are captured at the same
 * scroll position with the fonts of the new language loaded, and the page height only shrinks once
 * that part is off the screen.
 */

/** Same rule as the theme switch: only when motion is welcome and the browser has View Transitions. */
export const shouldAnimateLanguageChange = shouldAnimateThemeChange;

/** Longest wait for the new page before the switch stops waiting (the browser's own limit is ~4 s). */
const NEW_PAGE_TIMEOUT_MS = 3000;

/** Longest wait for the fonts of the new language (Cyrillic, Latin Extended) once the page is there. */
const FONTS_TIMEOUT_MS = 500;

function whenFontsReady(timeoutMs = FONTS_TIMEOUT_MS): Promise<void> {
  const ready = typeof document !== 'undefined' ? document.fonts?.ready : undefined;
  if (!ready) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, timeoutMs);
    void ready.then(() => {
      clearTimeout(timer);
      resolve();
    });
  });
}

/**
 * Keeps the page at least as tall as it is now while the language changes, so a shorter page in the
 * new language cannot clamp the scroll position (which would capture the new page somewhere else).
 */
let heightLock: { apply(): void; release(): void; settle(): void } | null = null;

function lockPageHeight(): void {
  heightLock?.release();
  const root = document.documentElement;
  const previous = root.style.minHeight;
  const locked = `${root.scrollHeight}px`;
  root.style.minHeight = locked;
  const onScroll = () => {
    if (fits()) stop();
  };
  /**
   * Whether the page can take its own height without moving what is on the screen: measured on the
   * body, since taking the lock off just to measure would already clamp the scroll position.
   */
  function fits(): boolean {
    const natural = document.body.getBoundingClientRect().bottom + window.scrollY;
    if (window.scrollY + window.innerHeight > Math.ceil(natural)) return false;
    root.style.minHeight = previous;
    return true;
  }
  function stop() {
    window.removeEventListener('scroll', onScroll);
    if (heightLock === lock) heightLock = null;
  }
  const lock: NonNullable<typeof heightLock> = {
    /** Sets it again: React drops the inline style of <html> when it mounts the new layout. */
    apply: () => {
      root.style.minHeight = locked;
    },
    release: () => {
      root.style.minHeight = previous;
      stop();
    },
    /** After the switch: shrink now if that is out of sight, else once the visitor scrolls up. */
    settle: () => {
      if (fits()) stop();
      else window.addEventListener('scroll', onScroll, { passive: true });
    },
  };
  heightLock = lock;
}

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
  const x = window.scrollX;
  const y = window.scrollY;
  lockPageHeight();
  const transition = document.startViewTransition(async () => {
    navigate();
    await whenLanguageIs(locale);
    heightLock?.apply();
    await whenFontsReady();
    // The new page is captured where the old one was (the router keeps the scroll, but a remount
    // or a shorter page may still have moved it).
    if (window.scrollX !== x || window.scrollY !== y) window.scrollTo(x, y);
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
      heightLock?.settle();
    });
  try {
    await transition.updateCallbackDone;
  } catch {
    // The update itself failed (e.g. the navigation threw): the router shows what it can.
  }
  afterSwitch?.();
}
