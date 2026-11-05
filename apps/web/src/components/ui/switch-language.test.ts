import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { shouldAnimateLanguageChange, switchLanguage, whenLanguageIs } from './switch-language';

const root = document.documentElement;

/** A stand-in for document.startViewTransition (jsdom has none) that runs the update like a browser. */
function fakeViewTransitions() {
  const started: { updateCallbackDone: Promise<void>; finish: () => void }[] = [];
  const start = vi.fn((update: () => Promise<void> | void) => {
    let finish!: () => void;
    const finished = new Promise<void>((resolve) => (finish = resolve));
    const updateCallbackDone = Promise.resolve().then(update);
    const ready = updateCallbackDone.then(() => undefined);
    started.push({ updateCallbackDone, finish });
    return { updateCallbackDone, ready, finished, skipTransition: () => finish() };
  });
  Object.defineProperty(document, 'startViewTransition', { configurable: true, value: start });
  return { start, started };
}

/**
 * What the router does: the new page renders with its own <html lang>, a moment later. React mounts
 * the layout afresh for the new language and, taking over <html>, drops the attributes it did not set.
 */
function navigateTo(locale: string) {
  return vi.fn(() => {
    setTimeout(() => {
      delete root.dataset['languageSwitch'];
      root.setAttribute('lang', locale);
    }, 10);
  });
}

beforeEach(() => {
  root.setAttribute('lang', 'en');
});

afterEach(() => {
  Reflect.deleteProperty(document, 'startViewTransition');
  delete root.dataset['languageSwitch'];
  vi.useRealTimers();
});

describe('shouldAnimateLanguageChange', () => {
  it('animates only when motion is allowed and View Transitions are supported', () => {
    expect(shouldAnimateLanguageChange(false, true)).toBe(true);
    expect(shouldAnimateLanguageChange(true, true)).toBe(false);
    expect(shouldAnimateLanguageChange(false, false)).toBe(false);
  });
});

describe('whenLanguageIs', () => {
  it('resolves once <html lang> is the new language', async () => {
    let done = false;
    const waiting = whenLanguageIs('lv').then(() => (done = true));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(done).toBe(false);
    root.setAttribute('lang', 'lv');
    await waiting;
    expect(done).toBe(true);
  });

  it('resolves right away when the page is already in that language', async () => {
    await expect(whenLanguageIs('en')).resolves.toBeUndefined();
  });

  it('gives up waiting after a while, so a slow page never leaves the switch hanging', async () => {
    vi.useFakeTimers();
    const waiting = whenLanguageIs('ru', 3000);
    await vi.advanceTimersByTimeAsync(3000);
    await expect(waiting).resolves.toBeUndefined();
  });
});

describe('switchLanguage', () => {
  it('starts the transition around the navigation and lets it capture the new page only when it has rendered', async () => {
    const { start, started } = fakeViewTransitions();
    const navigate = navigateTo('lv');

    const switching = switchLanguage({ locale: 'lv', navigate, animate: true });

    expect(start).toHaveBeenCalledTimes(1);
    expect(root.dataset['languageSwitch']).toBe(''); // the CSS animation and the header's own name
    await switching;
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(root.lang).toBe('lv'); // the update callback waited for the new language
    await started[0]!.updateCallbackDone;
    // Set again on the new page before the browser captures it, so the CSS animates the new state too.
    expect(root.dataset['languageSwitch']).toBe('');

    started[0]!.finish();
    await vi.waitFor(() => expect(root.dataset['languageSwitch']).toBeUndefined());
  });

  it('switches at once, without a transition, for people who prefer reduced motion', async () => {
    const { start } = fakeViewTransitions();
    const navigate = navigateTo('ru');

    await switchLanguage({ locale: 'ru', navigate, animate: shouldAnimateLanguageChange(true, true) });

    expect(start).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(root.dataset['languageSwitch']).toBeUndefined();
  });

  it('switches at once in a browser without View Transitions, never touching the missing API', async () => {
    const navigate = navigateTo('lv');
    await switchLanguage({ locale: 'lv', navigate, animate: shouldAnimateLanguageChange(false, false) });
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(root.lang).toBe('lv');
    expect(root.dataset['languageSwitch']).toBeUndefined();
  });

  it('calls afterSwitch once the new page is there, with and without the animation', async () => {
    fakeViewTransitions();
    const seen: string[] = [];
    await switchLanguage({
      locale: 'lv',
      navigate: navigateTo('lv'),
      animate: true,
      afterSwitch: () => seen.push(root.lang),
    });
    await switchLanguage({
      locale: 'ru',
      navigate: navigateTo('ru'),
      animate: false,
      afterSwitch: () => seen.push(root.lang),
    });
    expect(seen).toEqual(['lv', 'ru']);
  });

  it('a quick second switch keeps the animation state until its own transition ends', async () => {
    const { started } = fakeViewTransitions();
    await switchLanguage({ locale: 'lv', navigate: navigateTo('lv'), animate: true });
    await switchLanguage({ locale: 'ru', navigate: navigateTo('ru'), animate: true });

    started[0]!.finish(); // the browser ends the first one as the second starts
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(root.dataset['languageSwitch']).toBe('');

    started[1]!.finish();
    await vi.waitFor(() => expect(root.dataset['languageSwitch']).toBeUndefined());
  });

  it('still switches when the browser skips the transition', async () => {
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: (update: () => Promise<void>) => {
        const updateCallbackDone = Promise.resolve().then(update);
        const skipped = updateCallbackDone.then(() =>
          Promise.reject(new DOMException('skipped', 'AbortError')),
        );
        skipped.catch(() => {});
        return { updateCallbackDone, ready: skipped, finished: updateCallbackDone, skipTransition() {} };
      },
    });
    const navigate = navigateTo('ru');
    await switchLanguage({ locale: 'ru', navigate, animate: true });
    expect(root.lang).toBe('ru');
    await vi.waitFor(() => expect(root.dataset['languageSwitch']).toBeUndefined());
  });
});
