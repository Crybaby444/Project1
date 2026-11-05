'use client';

import { usePathname } from 'next/navigation';
import { ViewTransition, type ReactNode } from 'react';

/**
 * Page changes as a soft cross-fade with a slight scale (motion.css, `.page-out` / `.page-in`).
 * Next.js runs every route change as a React transition, and React plays a View Transition for a
 * `<ViewTransition>` that leaves or enters in it: keyed by the path, the old page leaves and the new
 * one enters. The header is outside, so it stays put. Browsers without View Transitions, and
 * visitors who prefer reduced motion, get an instant change.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <ViewTransition key={pathname} enter="page-in" exit="page-out" default="none">
      {children}
    </ViewTransition>
  );
}
