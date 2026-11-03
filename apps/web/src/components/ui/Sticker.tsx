'use client';

import { useState, type AnimationEvent, type ReactNode } from 'react';
import { prefersReducedMotion } from '@/lib/motion';

export type StickerKind = 'coin' | 'check' | 'bolt' | 'star' | 'yoyo';

type StickerProps = {
  kind: StickerKind;
  /** Gives the sticker a meaning for assistive tech; without it the sticker is decorative. */
  label?: string;
  /** Rendered size in px. */
  size?: number;
  className?: string;
};

// Flat stickers on an 80×80 board with a 1px black outline that stays 1px at any size.
const OUTLINE = { stroke: '#000', strokeWidth: 1, vectorEffect: 'non-scaling-stroke' as const };

const ART: Record<StickerKind, ReactNode> = {
  coin: (
    <>
      <circle cx="40" cy="40" r="34" fill="var(--sticker-sun)" {...OUTLINE} />
      <circle cx="40" cy="40" r="25" fill="none" {...OUTLINE} strokeDasharray="4 5" />
      <path d="M48 28a14 14 0 1 0 0 24M26 37h18M26 44h18" fill="none" {...OUTLINE} strokeWidth={4} strokeLinecap="round" />
    </>
  ),
  check: (
    <>
      <circle cx="40" cy="40" r="34" fill="var(--sticker-mint)" {...OUTLINE} />
      <path d="M25 41l10 10 21-22" fill="none" {...OUTLINE} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  bolt: (
    <>
      <rect x="8" y="8" width="64" height="64" rx="18" fill="var(--sticker-ember)" {...OUTLINE} />
      <path d="M44 15 23 44h15l-4 21 23-31H42z" fill="#fff" {...OUTLINE} strokeLinejoin="round" />
    </>
  ),
  star: (
    <path
      d="M40 4l8 20 20-8-8 20 20 8-20 8 8 20-20-8-8 20-8-20-20 8 8-20-20-8 20-8-8-20 20 8z"
      fill="var(--sticker-lavender)"
      {...OUTLINE}
      strokeLinejoin="round"
    />
  ),
  yoyo: (
    <>
      <path d="M40 2v20" {...OUTLINE} strokeWidth={2} strokeLinecap="round" />
      <circle cx="40" cy="46" r="30" fill="var(--sticker-blue)" {...OUTLINE} />
      <circle cx="40" cy="46" r="11" fill="#fff" {...OUTLINE} />
    </>
  ),
};

/**
 * Decorative sticker (DESIGN.md "Project adaptations" §1): still at rest, wobbles on hover,
 * spins once per click. In dark mode it gets a thin white die-cut edge.
 */
export function Sticker({ kind, label, size = 64, className = '' }: StickerProps) {
  const [spinning, setSpinning] = useState(false);

  function onClick() {
    if (prefersReducedMotion()) return; // no animation would run, so nothing would end it
    setSpinning(true);
  }

  function onAnimationEnd(event: AnimationEvent<HTMLSpanElement>) {
    if (event.animationName === 'sticker-spin') setSpinning(false);
  }

  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true as const };

  return (
    <span
      {...a11y}
      data-spinning={spinning || undefined}
      onClick={onClick}
      onAnimationEnd={onAnimationEnd}
      style={{ width: size, height: size }}
      className={`inline-block cursor-pointer select-none [filter:drop-shadow(0_0_0.6px_var(--sticker-edge))_drop-shadow(0_0_0.6px_var(--sticker-edge))] hover:animate-sticker-wobble data-[spinning]:animate-sticker-spin ${className}`}
    >
      <svg viewBox="0 0 80 80" width="100%" height="100%" aria-hidden="true" focusable="false">
        {ART[kind]}
      </svg>
    </span>
  );
}
