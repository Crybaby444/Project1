import { afterEach, describe, expect, it, vi } from 'vitest';
import { shouldAnimatePageChange, switchPage, whenPathIs } from './switch-page';

const root = document.documentElement;

/** A stand-in for document.startViewTransition (jsdom has none) that runs the update like a browser. */
function fakeViewTransitions() {
  const finishes: (() => void)[] = [];
  const start = vi.fn((update: () => Promise<void> | void) => {
    let finish!: () => void;
    const finished = new Promise<void>((resolve) => (finish = resolve));
    const updateCallbackDone = Promise.resolve().then(update);
    finishes.push(finish);
    return { updateCallbackDone, ready: updateCallbackDone, finished, skipTransition: () => finish() };
  });
  Object.defineProperty(document, 'startViewTransition', { configurable: true, value: start });
  return { start, finishes, finishAll: () => finishes.forEach((finish) => finish()) };
}

/** What the router does: the address changes a moment after the navigation starts. */
function navigateTo(pathname: string) {
  return vi.fn(() => {
    setTimeout(() => window.history.pushState(null, '', pathname), 10);
  });
}

afterEach(() => {
  Reflect.deleteProperty(document, 'startViewTransition');
  delete root.dataset['pageSwitch'];
  window.history.replaceState(null, '', '/');
  vi.useRealTimers();
});

describe('shouldAnimatePageChange', () => {
  it('animates only when motion is allowed and View Transitions are supported', () => {
    expect(shouldAnimatePageChange(false, true)).toBe(true);
    expect(shouldAnimatePageChange(true, true)).toBe(false);
    expect(shouldAnimatePageChange(false, false)).toBe(false);
  });
});

describe('whenPathIs', () => {
  it('resolves once the address is the new page', async () => {
    let done = false;
    const waiting = whenPathIs('/faq').then(() => (done = true));
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(done).toBe(false);
    window.history.pushState(null, '', '/faq');
    await waiting;
    expect(done).toBe(true);
  });

  it('gives up after the timeout instead of hanging the transition', async () => {
    vi.useFakeTimers();
    let done = false;
    const waiting = whenPathIs('/never', 3000).then(() => (done = true));
    await vi.advanceTimersByTimeAsync(2999);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await waiting;
    expect(done).toBe(true);
  });
});

describe('switchPage', () => {
  it('without animation just navigates', async () => {
    const { start } = fakeViewTransitions();
    const navigate = navigateTo('/terms');
    await switchPage({ pathname: '/terms', navigate, animate: false });
    expect(navigate).toHaveBeenCalledOnce();
    expect(start).not.toHaveBeenCalled();
    expect(root.dataset['pageSwitch']).toBeUndefined();
  });

  it('with animation navigates inside one View Transition that waits for the new page', async () => {
    const { start, finishAll } = fakeViewTransitions();
    const navigate = navigateTo('/faq');
    await switchPage({ pathname: '/faq', navigate, animate: true });
    expect(start).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledOnce();
    expect(window.location.pathname).toBe('/faq');
    // The transition styles apply during the transition and are removed after it.
    expect(root.dataset['pageSwitch']).toBe('');
    finishAll();
    await vi.waitFor(() => expect(root.dataset['pageSwitch']).toBeUndefined());
  });

  it('a second quick switch takes the transition over, and the first does not clean up its styles', async () => {
    const { finishes } = fakeViewTransitions();
    await switchPage({ pathname: '/faq', navigate: navigateTo('/faq'), animate: true });
    await switchPage({ pathname: '/terms', navigate: navigateTo('/terms'), animate: true });
    expect(window.location.pathname).toBe('/terms');

    finishes[0]!();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(root.dataset['pageSwitch']).toBe('');

    finishes[1]!();
    await vi.waitFor(() => expect(root.dataset['pageSwitch']).toBeUndefined());
  });

  it('does not hold the old page when the link redirects somewhere else', async () => {
    fakeViewTransitions();
    window.history.replaceState(null, '', '/faq');
    // The router lands on "/" instead of "/register" (a signed-in visitor is sent home).
    const navigate = navigateTo('/');
    const started = Date.now();
    await switchPage({ pathname: '/register', navigate, animate: true });
    expect(window.location.pathname).toBe('/');
    expect(Date.now() - started).toBeLessThan(500);
  });
});
