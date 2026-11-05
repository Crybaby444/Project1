import { shouldAnimateThemeChange } from '@/components/theme/switch-theme';

/**
 * Moving between pages plays like the language switch (globals.css): the old page blurs and fades,
 * a pastel paper sheet wipes across, the new page fades in, and the header stays put. Same rule as
 * the theme and language switches: only when motion is welcome and the browser has View Transitions.
 */
export const shouldAnimatePageChange = shouldAnimateThemeChange;

/** Longest wait for the new page before the switch stops waiting (the browser's own limit is ~4 s). */
const NEW_PAGE_TIMEOUT_MS = 3000;
const POLL_MS = 16;

function currentPath(): string {
  return decodeURI(window.location.pathname);
}

/**
 * Resolves once the address is `pathname`: the router has committed the new page (it updates the
 * history entry in the same commit). Gives up after `timeoutMs`.
 */
export function whenPathIs(pathname: string, timeoutMs = NEW_PAGE_TIMEOUT_MS): Promise<void> {
  const target = decodeURI(pathname);
  return new Promise((resolve) => {
    let poll: ReturnType<typeof setTimeout> | undefined;
    const done = () => {
      clearTimeout(poll);
      clearTimeout(limit);
      resolve();
    };
    const limit = setTimeout(done, timeoutMs);
    const check = () => {
      if (currentPath() === target) done();
      else poll = setTimeout(check, POLL_MS);
    };
    check();
  });
}

/** The transition that owns `data-page-switch` right now; a quicker second switch takes it over. */
let current: object | null = null;

type SwitchPageOptions = {
  /** Path of the new page as the address bar will show it (`/lv/faq`). */
  pathname: string;
  /** Starts the client navigation. */
  navigate: () => void;
  animate: boolean;
};

/**
 * Moves to another page. With `animate`, the navigation runs inside a View Transition whose update
 * waits for the new page, so the browser holds the old picture until the new one is rendered. A
 * skipped or failed transition still navigates: the page is never left half-way.
 */
export async function switchPage({ pathname, navigate, animate }: SwitchPageOptions): Promise<void> {
  if (!animate) {
    navigate();
    return;
  }

  const root = document.documentElement;
  const owner = {};
  current = owner;
  root.dataset['pageSwitch'] = '';
  const transition = document.startViewTransition(async () => {
    navigate();
    await whenPathIs(pathname);
    // The new page may come with a fresh <html> (another language layout): mark it again.
    if (current === owner) root.dataset['pageSwitch'] = '';
  });
  void transition.finished
    .catch(() => {})
    .finally(() => {
      if (current !== owner) return;
      current = null;
      delete root.dataset['pageSwitch'];
    });
  try {
    await transition.updateCallbackDone;
  } catch {
    // The update itself failed (e.g. the navigation threw): the router shows what it can.
  }
}
