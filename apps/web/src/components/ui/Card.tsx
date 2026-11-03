'use client';

import type { HTMLAttributes, PointerEvent } from 'react';

const MAX_TILT_DEG = 5;

type CardProps = HTMLAttributes<HTMLDivElement> & {
  /** Tilts toward the pointer like a sticker being peeled and lifts 6px. */
  interactive?: boolean;
  /** Featured cards use the larger 40px radius. */
  featured?: boolean;
};

function setTilt(el: HTMLElement, rx: number, ry: number) {
  el.style.setProperty('--rx', `${rx}deg`);
  el.style.setProperty('--ry', `${ry}deg`);
}

export function Card({ interactive = false, featured = false, className = '', children, ...rest }: CardProps) {
  const base = `border border-ink bg-surface p-6 text-ink ${featured ? 'rounded-card-xl' : 'rounded-card'}`;

  if (!interactive) {
    return (
      <div className={`${base} ${className}`} {...rest}>
        {children}
      </div>
    );
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const el = event.currentTarget;
    const rect = el.getBoundingClientRect();
    // -1…1 across the card; the edge under the pointer dips toward the viewer.
    const px = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const py = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    const clamp = (v: number) => Math.max(-1, Math.min(1, v));
    setTilt(el, round(-clamp(py) * MAX_TILT_DEG), round(clamp(px) * MAX_TILT_DEG));
    rest.onPointerMove?.(event);
  }

  function onPointerLeave(event: PointerEvent<HTMLDivElement>) {
    setTilt(event.currentTarget, 0, 0);
    rest.onPointerLeave?.(event);
  }

  return (
    <div
      {...rest}
      data-interactive="true"
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className={`${base} [transform:perspective(900px)_rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))] transition-transform duration-[250ms] ease-yoyo will-change-transform hover:[transform:perspective(900px)_translateY(-6px)_rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))] motion-reduce:hover:[transform:none] ${className}`}
    >
      {children}
    </div>
  );
}

function round(value: number) {
  return Math.round(value * 100) / 100 + 0;
}
