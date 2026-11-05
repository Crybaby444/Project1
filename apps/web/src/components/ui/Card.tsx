'use client';

import type { HTMLAttributes, PointerEvent, ReactNode } from 'react';
import { tiltToward } from '@/components/motion/Tilt';
import { prefersReducedMotion } from '@/lib/motion';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  /** Tilts toward a mouse pointer (at most 4°, like peeling a sticker) and lifts on hover. */
  interactive?: boolean;
};

/** Paper card: 20px radius, 1px ink outline, never a shadow (DESIGN.md). */
export function Card({ children, interactive = false, className = '', onPointerMove, onPointerLeave, ...rest }: CardProps) {
  function handleMove(event: PointerEvent<HTMLDivElement>) {
    onPointerMove?.(event);
    // A mouse only: on touch the pointer moves while scrolling, and a tilting card would feel loose.
    if (!interactive || event.pointerType !== 'mouse' || prefersReducedMotion()) return;
    const card = event.currentTarget;
    const { rx, ry } = tiltToward(card.getBoundingClientRect(), event.clientX, event.clientY);
    card.style.setProperty('--rx', rx);
    card.style.setProperty('--ry', ry);
  }

  function handleLeave(event: PointerEvent<HTMLDivElement>) {
    onPointerLeave?.(event);
    if (!interactive) return;
    event.currentTarget.style.setProperty('--rx', '0deg');
    event.currentTarget.style.setProperty('--ry', '0deg');
  }

  const motion = interactive
    ? 'transition-transform duration-[450ms] ease-yoyo [transform:perspective(900px)_rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))_translateY(var(--lift,0px))] hover:[--lift:-6px]'
    : '';

  return (
    <div
      {...rest}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      className={`rounded-card border border-ink bg-surface text-ink ${motion} ${className}`}
    >
      {children}
    </div>
  );
}
