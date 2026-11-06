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
      root.removeAttribute('style');
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
  root.style.minHeight = '';
  vi.restoreAllMocks();
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

  it('captures the old and the new page at the same scroll position, even when the new one is shorter', async () => {
    const { started } = fakeViewTransitions();
    let y = 600;
    const scrollTo = vi.fn((_x: number, to: number) => (y = to));
    vi.spyOn(window, 'scrollY', 'get').mockImplementation(() => y);
    vi.spyOn(window, 'scrollTo').mockImplementation(scrollTo as unknown as typeof window.scrollTo);
    Object.defineProperty(root, 'scrollHeight', { configurable: true, get: () => 2400 });
    const navigate = vi.fn(() => {
      setTimeout(() => {
        y = 200; // the browser clamped the scroll: the new page is shorter
        root.removeAttribute('style'); // React takes over <html> and drops what it did not render
        root.setAttribute('lang', 'lv');
      }, 10);
    });

    await switchLanguage({ locale: 'lv', navigate, animate: true });
    await started[0]!.updateCallbackDone;

    // While it switches, the page keeps its height, so nothing jumps or gets clamped…
    expect(root.style.minHeight).toBe('2400px');
    // …and the new page is captured where the old one was.
    expect(y).toBe(600);
    Reflect.deleteProperty(root, 'scrollHeight');
  });

  it('lets the page shrink only once that part is out of sight', async () => {
    const { started } = fakeViewTransitions();
    let y = 1800;
    let natural = 1200;
    vi.spyOn(window, 'scrollY', 'get').mockImplementation(() => y);
    vi.spyOn(window, 'scrollTo').mockImplementation((() => {}) as typeof window.scrollTo);
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(600);
    Object.defineProperty(root, 'scrollHeight', {
      configurable: true,
      get: () => (root.style.minHeight ? Math.max(natural, parseFloat(root.style.minHeight)) : natural),
    });
    // The content (the body) ends at `natural`, wherever the visitor is.
    vi.spyOn(document.body, 'getBoundingClientRect').mockImplementation(
      () => ({ bottom: natural - y }) as DOMRect,
    );
    natural = 2400;
    await switchLanguage({ locale: 'ru', navigate: navigateTo('ru'), animate: true });
    natural = 1200; // the Russian page is shorter
    started[0]!.finish();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // At the bottom of the old page: shrinking now would pull the page up under the visitor.
    expect(root.style.minHeight).toBe('2400px');
    y = 500;
    window.dispatchEvent(new Event('scroll'));
    expect(root.style.minHeight).toBe('');
    Reflect.deleteProperty(root, 'scrollHeight');
  });

  it('waits (a little) for the fonts of the new language before the browser captures it', async () => {
    const { started } = fakeViewTransitions();
    let loaded!: () => void;
    const ready = new Promise<void>((resolve) => (loaded = resolve));
    Object.defineProperty(document, 'fonts', { configurable: true, value: { ready } });
    let done = false;
    void switchLanguage({ locale: 'lv', navigate: navigateTo('lv'), animate: true });
    await vi.waitFor(() => expect(started).toHaveLength(1));
    void started[0]!.updateCallbackDone.then(() => (done = true));
    await vi.waitFor(() => expect(root.lang).toBe('lv'));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(done).toBe(false);
    loaded();
    await vi.waitFor(() => expect(done).toBe(true));
    Reflect.deleteProperty(document, 'fonts');
  });

  it('never leaves the page frozen: a transition that does not end is skipped', async () => {
    vi.useFakeTimers();
    const { start, started } = fakeViewTransitions();
    const skip = vi.fn(() => started[0]!.finish());
    const switching = switchLanguage({ locale: 'lv', navigate: navigateTo('lv'), animate: true });
    await vi.advanceTimersByTimeAsync(20); // the new page is there
    await switching;
    (start.mock.results[0]!.value as { skipTransition: () => void }).skipTransition = skip;

    // The animation is 440 ms: well past that, a browser that never ended it gets it ended.
    await vi.advanceTimersByTimeAsync(1000);
    expect(skip).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1000);
    expect(skip).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(root.dataset['languageSwitch']).toBeUndefined());
  });

  it('does not skip a transition that ended on time', async () => {
    vi.useFakeTimers();
    const { start, started } = fakeViewTransitions();
    const switching = switchLanguage({ locale: 'ru', navigate: navigateTo('ru'), animate: true });
    await vi.advanceTimersByTimeAsync(20);
    await switching;
    const transition = start.mock.results[0]!.value as { skipTransition: () => void };
    const skip = vi.fn();
    transition.skipTransition = skip;
    started[0]!.finish();
    await vi.advanceTimersByTimeAsync(5000);
    expect(skip).not.toHaveBeenCalled();
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
