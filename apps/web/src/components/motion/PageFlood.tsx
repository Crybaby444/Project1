'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '@/lib/motion';
import { createFlood, sectionOf, shouldFlood } from '@/lib/motion/dot-flood';

type Running = { flood: ReturnType<typeof createFlood>; covered: Promise<void>; from: string; fallback: number };

/** Longest the night may stay if the new page never comes (an error, a redirect to the same address). */
const GIVE_UP_MS = 4000;

/**
 * Every move to another page of the site goes through the dot flood (owner, 2026-11-16): a plain click on
 * a link to another address covers the screen in night dots from the click, and once the new page is
 * there they shrink away and show it. Language links, links to the same page, new tabs, other sites,
 * reduced motion and automation are left alone. It sets `html[data-flooding]` while it runs, so the
 * View Transition of TransitionLink stands aside.
 */
export function PageFlood() {
  const pathname = usePathname();
  const running = useRef<Running | null>(null);

  useEffect(() => {
    const finish = (r: Running) => {
      window.clearTimeout(r.fallback);
      void r.covered.then(() => r.flood.reveal()).then(() => {
        if (running.current === r) {
          running.current = null;
          delete document.documentElement.dataset.flooding;
        }
      });
    };
    const onClick = (event: MouseEvent) => {
      if (running.current) return;
      const a = (event.target as Element | null)?.closest?.('a[href]');
      if (!(a instanceof HTMLAnchorElement)) return;
      const url = new URL(a.href, window.location.href);
      const go = shouldFlood({
        plainClick: event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && !a.target && !a.hasAttribute('download'),
        sameOrigin: url.origin === window.location.origin && !url.pathname.startsWith('/api/'),
        samePage: url.pathname === window.location.pathname,
        sameSection: sectionOf(url.pathname) === sectionOf(window.location.pathname),
        language: a.hasAttribute('hreflang'),
        optOut: a.closest('[data-no-flood]') !== null,
        reducedMotion: prefersReducedMotion(),
        automated: navigator.webdriver === true,
      });
      if (!go) return;
      document.documentElement.dataset.flooding = '';
      const flood = createFlood();
      const r: Running = { flood, covered: flood.cover({ x: event.clientX, y: event.clientY }), from: window.location.pathname, fallback: 0 };
      r.fallback = window.setTimeout(() => finish(r), GIVE_UP_MS);
      running.current = r;
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  useEffect(() => {
    const r = running.current;
    if (!r || pathname === r.from) return;
    window.clearTimeout(r.fallback);
    // One frame for the new page to paint under the night, then the dots go.
    const frame = requestAnimationFrame(() => {
      void r.covered.then(() => r.flood.reveal()).then(() => {
        if (running.current === r) {
          running.current = null;
          delete document.documentElement.dataset.flooding;
        }
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  return null;
}
