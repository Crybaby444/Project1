'use client';

import type { PointerEvent, ReactNode } from 'react';
import { prefersReducedMotion } from '@/lib/motion';

/** The most a card tips toward the pointer, in degrees. */
export const MAX_TILT_DEG = 4;

/** Rotation toward a pointer at (x, y) inside a box, as CSS angles (rounded to 0.01°, never -0). */
export function tiltToward(
  rect: { left: number; top: number; width: number; height: number },
  x: number,
  y: number,
  max = MAX_TILT_DEG,
): { rx: string; ry: string } {
  const dx = Math.min(0.5, Math.max(-0.5, (x - rect.left) / rect.width - 0.5));
  const dy = Math.min(0.5, Math.max(-0.5, (y - rect.top) / rect.height - 0.5));
  const deg = (value: number) => `${Math.round(value * 100) / 100 || 0}deg`;
  return { rx: deg(-dy * 2 * max), ry: deg(dx * 2 * max) };
}

type TiltProps = {
  children: ReactNode;
  /** Classes for the card face (colour, padding, layout). Its corners also shape the shadow. */
  className?: string;
  /** Corner class shared by the face and its shadow. */
  radius?: string;
};

/**
 * A bento card that tilts toward a mouse pointer (at most 4°), lifts off a hard ink shadow on hover
 * or keyboard focus, and bounces any `[data-bounce]` sticker inside (motion.css, `[data-tilt]`).
 * The shadow is a separate ink layer the face lifts off, so only transforms animate. No tilt for
 * touch or pen, and nothing moves with reduced motion.
 */
export function Tilt({ children, className = '', radius = 'rounded-card' }: TiltProps) {
  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'mouse' || prefersReducedMotion()) return;
    const box = event.currentTarget;
    const { rx, ry } = tiltToward(box.getBoundingClientRect(), event.clientX, event.clientY);
    box.style.setProperty('--rx', rx);
    box.style.setProperty('--ry', ry);
  }

  function onPointerLeave(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.style.setProperty('--rx', '0deg');
    event.currentTarget.style.setProperty('--ry', '0deg');
  }

  return (
    <div
      data-tilt=""
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className="relative h-full"
    >
      <span aria-hidden="true" data-tilt-shadow="" className={`bg-ink absolute inset-0 ${radius}`} />
      <div data-tilt-face="" className={`border-ink relative h-full border ${radius} ${className}`}>
        {children}
      </div>
    </div>
  );
}
