import { fireEvent, screen } from '@testing-library/react';
import {
  AppRouterContext,
  type AppRouterInstance,
} from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { stubMatchMedia } from '@/test/match-media';
import { renderWithIntl } from '@/test/render';
import { TransitionLink } from './TransitionLink';

const push = vi.hoisted(() =>
  vi.fn((href: string) => {
    setTimeout(() => window.history.pushState(null, '', href), 0);
  }),
);

/** Renders inside a stand-in for the app router, as on a real Next page. */
function renderInApp(ui: ReactElement, locale: 'en' | 'lv' = 'en') {
  const router = {
    push,
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  } as unknown as AppRouterInstance;
  return renderWithIntl(<AppRouterContext.Provider value={router}>{ui}</AppRouterContext.Provider>, locale);
}

function fakeViewTransitions() {
  const start = vi.fn((update: () => Promise<void> | void) => {
    const updateCallbackDone = Promise.resolve().then(update);
    return {
      updateCallbackDone,
      ready: updateCallbackDone,
      finished: updateCallbackDone,
      skipTransition() {},
    };
  });
  Object.defineProperty(document, 'startViewTransition', { configurable: true, value: start });
  return start;
}

afterEach(() => {
  push.mockClear();
  Reflect.deleteProperty(document, 'startViewTransition');
  delete document.documentElement.dataset['pageSwitch'];
  window.history.replaceState(null, '', '/');
});

describe('TransitionLink', () => {
  it('is a normal link with the address in the page language', () => {
    renderInApp(<TransitionLink href="/faq">FAQ</TransitionLink>, 'lv');
    expect(screen.getByRole('link', { name: 'FAQ' })).toHaveAttribute('href', '/lv/faq');
  });

  it('a plain click moves to the page through the router inside a View Transition', async () => {
    const start = fakeViewTransitions();
    renderInApp(<TransitionLink href="/faq">FAQ</TransitionLink>);
    const event = fireEvent.click(screen.getByRole('link', { name: 'FAQ' }));
    expect(event).toBe(false); // default prevented: the router navigates, not the browser
    await vi.waitFor(() => expect(push).toHaveBeenCalledWith('/faq'));
    expect(start).toHaveBeenCalledOnce();
  });

  it.each([
    ['Ctrl', { ctrlKey: true }],
    ['Cmd', { metaKey: true }],
    ['Shift', { shiftKey: true }],
    ['Alt', { altKey: true }],
    ['middle button', { button: 1 }],
  ])('a click with %s is left to the browser (new tab, new window, download)', (_name, init) => {
    const start = fakeViewTransitions();
    renderInApp(<TransitionLink href="/faq">FAQ</TransitionLink>);
    fireEvent.click(screen.getByRole('link', { name: 'FAQ' }), init);
    expect(push).not.toHaveBeenCalled();
    expect(start).not.toHaveBeenCalled();
  });

  it('on a Latvian page the router gets the Latvian address, keeping query and fragment', async () => {
    fakeViewTransitions();
    renderInApp(<TransitionLink href="/faq?x=1#deposit">FAQ</TransitionLink>, 'lv');
    fireEvent.click(screen.getByRole('link', { name: 'FAQ' }));
    await vi.waitFor(() => expect(push).toHaveBeenCalledWith('/lv/faq?x=1#deposit'));
  });

  it('outside a Next page (no app router) it is a plain link', () => {
    renderWithIntl(<TransitionLink href="/faq">FAQ</TransitionLink>);
    expect(fireEvent.click(screen.getByRole('link', { name: 'FAQ' }))).toBe(true);
  });

  it('a link to a part of the same page scrolls as usual', () => {
    const start = fakeViewTransitions();
    renderInApp(<TransitionLink href="/#safety">Safety</TransitionLink>);
    fireEvent.click(screen.getByRole('link', { name: 'Safety' }));
    expect(push).not.toHaveBeenCalled();
    expect(start).not.toHaveBeenCalled();
  });

  it('with reduced motion it still uses the router, without a transition', async () => {
    stubMatchMedia(true);
    const start = fakeViewTransitions();
    renderInApp(<TransitionLink href="/terms">Terms</TransitionLink>);
    fireEvent.click(screen.getByRole('link', { name: 'Terms' }));
    await vi.waitFor(() => expect(push).toHaveBeenCalledWith('/terms'));
    expect(start).not.toHaveBeenCalled();
  });
});
