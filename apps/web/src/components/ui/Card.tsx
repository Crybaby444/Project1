'use client';

import type { HTMLAttributes, PointerEvent } from 'react';
import { prefersReducedMotion } from '@/lib/motion';

const MAX_TILT_DEG = 5;

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Tilts toward the cursor and lifts, like a sticker being peeled. */
  interactive?: boolean;
  /** 40px radius for highlighted cards. */
  elevated?: boolean;
}

function setTilt(el: HTMLElement, rx: number, ry: number) {
  el.style.setProperty('--rx', `${rx}deg`);
  el.style.setProperty('--ry', `${ry}deg`);
}

export function Card({
  interactive = false,
  elevated = false,
  className = '',
  onPointerMove,
  onPointerLeave,
  children,
  ...rest
}: CardProps) {
  function handleMove(event: PointerEvent<HTMLDivElement>) {
    onPointerMove?.(event);
    if (!interactive || event.pointerType === 'touch' || prefersReducedMotion()) return;
    const el = event.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    const round = (n: number) => Math.round(n * 10) / 10 || 0;
    setTilt(el, round(-y * 2 * MAX_TILT_DEG), round(x * 2 * MAX_TILT_DEG));
  }

  function handleLeave(event: PointerEvent<HTMLDivElement>) {
    onPointerLeave?.(event);
    if (interactive) setTilt(event.currentTarget, 0, 0);
  }

  return (
    <div
      className={[
        'border border-ink bg-surface p-6 text-ink',
        elevated ? 'rounded-card-xl' : 'rounded-card',
        interactive
          ? '[transform:perspective(800px)_rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))] transition-transform duration-(--dur-base) ease-yoyo hover:[transform:perspective(800px)_rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))_translateY(-6px)]'
          : '',
        className,
      ].join(' ')}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      {...rest}
    >
      {children}
    </div>
  );
}
