'use client';

import type { HTMLAttributes, PointerEvent, ReactNode } from 'react';
import { prefersReducedMotion } from '@/lib/motion';

const MAX_TILT_DEG = 5;

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  /** Tilts toward the pointer (like peeling a sticker) and lifts on hover. */
  interactive?: boolean;
  /** Background and text classes; paper white by default, a sticker colour for accent cards. */
  fill?: string;
};

function degrees(value: number): string {
  // Round to 0.01° and turn -0 into 0.
  return `${Math.round(value * 100) / 100 || 0}deg`;
}

/** Paper card: 20px radius, 1px ink outline, never a shadow (DESIGN.md). */
export function Card({
  children,
  interactive = false,
  fill = 'bg-surface text-ink',
  className = '',
  onPointerMove,
  onPointerLeave,
  ...rest
}: CardProps) {
  function handleMove(event: PointerEvent<HTMLDivElement>) {
    onPointerMove?.(event);
    if (!interactive || prefersReducedMotion()) return;
    const card = event.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5; // -0.5 … 0.5
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    card.style.setProperty('--ry', degrees(x * 2 * MAX_TILT_DEG));
    card.style.setProperty('--rx', degrees(-y * 2 * MAX_TILT_DEG));
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
      className={`rounded-card border border-ink ${fill} ${motion} ${className}`}
    >
      {children}
    </div>
  );
}
