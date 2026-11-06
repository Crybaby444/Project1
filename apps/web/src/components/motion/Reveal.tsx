'use client';

import { useRef, type CSSProperties, type ElementType, type ReactNode } from 'react';
import { useInView, useReducedMotion } from './hooks';

type RevealProps = {
  children: ReactNode;
  as?: ElementType;
  /** Position in a group of reveals: later ones start a little later. */
  index?: number;
  className?: string;
};

/**
 * Rises and fades in as it scrolls into view (motion.css, `[data-reveal]`). Where the browser has
 * scroll-driven animations it is pure CSS tied to the scroll; elsewhere an IntersectionObserver
 * sets `data-shown` once. Content already in view on load is never hidden. With reduced motion it
 * is simply there.
 */
export function Reveal({ children, as: Tag = 'div', index = 0, className = '' }: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const inView = useInView(ref, { rootMargin: '0px 0px -8% 0px' });
  const shown = reduced || inView;

  return (
    <Tag
      ref={ref}
      data-reveal=""
      data-shown={shown ? '' : undefined}
      style={{ '--reveal-i': index } as CSSProperties}
      className={className}
    >
      {children}
    </Tag>
  );
}
