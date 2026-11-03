'use client';

import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '@/lib/motion';

export type StickerKind = 'coin' | 'check' | 'bolt' | 'star' | 'yoyo';

type StickerProps = {
  kind: StickerKind;
  /** When set the sticker is announced as an image; otherwise it is decorative. */
  label?: string;
  size?: number;
  /** Resting tilt in degrees — stickers are pinned at an angle, never grid-aligned. */
  rotate?: number;
  className?: string;
};

type Shape = { fill: string; body: string; detail?: string; detailStroke?: string; detailFill?: string };

// Flat shapes on a 64×64 board. `body` is outlined; `detail` is drawn on top.
const SHAPES: Record<StickerKind, Shape> = {
  coin: {
    fill: 'var(--sticker-sun)',
    body: 'M32 4a28 28 0 1 1 0 56a28 28 0 1 1 0-56Z',
    detail: 'M32 14a18 18 0 1 1 0 36a18 18 0 1 1 0-36Z M32 22v20 M26 27h9a4 4 0 0 1 0 8h-6a4 4 0 0 0 0 8h9',
  },
  check: {
    fill: 'var(--sticker-mint)',
    body: 'M18 4h28a14 14 0 0 1 14 14v28a14 14 0 0 1-14 14H18A14 14 0 0 1 4 46V18A14 14 0 0 1 18 4Z',
    detail: 'M18 33l9 9 19-20',
    detailStroke: '5',
  },
  bolt: {
    fill: 'var(--sticker-ember)',
    body: 'M37 3 9 37h19l-5 24 32-36H35l2-22Z',
  },
  star: {
    fill: 'var(--sticker-lavender)',
    body: 'M32 3l8.5 17.6 19.4 2.7-14 13.6 3.4 19.2L32 47l-17.3 9.1 3.4-19.2-14-13.6 19.4-2.7L32 3Z',
  },
  yoyo: {
    fill: 'var(--sticker-blue)',
    body: 'M32 10a25 25 0 1 1 0 50a25 25 0 1 1 0-50Z',
    detail: 'M32 26a9 9 0 1 1 0 18a9 9 0 1 1 0-18Z',
    detailFill: 'var(--sticker-violet)',
  },
};

/**
 * Flat SVG sticker with a 1px black outline (and a thin white die-cut edge in dark mode).
 * Still at rest; wobbles on hover and spins once on click.
 */
export function Sticker({ kind, label, size = 64, rotate = 0, className = '' }: StickerProps) {
  const [spinning, setSpinning] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  // Native listener: React's synthetic onAnimationEnd is vendor-prefixed in some environments.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const stop = () => setSpinning(false);
    el.addEventListener('animationend', stop);
    return () => el.removeEventListener('animationend', stop);
  }, []);
  const shape = SHAPES[kind];
  const a11y = label ? { role: 'img' as const, 'aria-label': label } : { 'aria-hidden': true as const };

  return (
    <span
      {...a11y}
      ref={ref}
      data-spinning={spinning || undefined}
      onClick={() => {
        if (!prefersReducedMotion()) setSpinning(true);
      }}
      className={`yoyo-sticker inline-block cursor-pointer select-none ${className}`}
      style={{ width: size, height: size, ['--sticker-rotate' as string]: `${rotate}deg` }}
    >
      <svg viewBox="-2 -2 68 68" width={size} height={size} className="block overflow-visible">
        {/* die-cut edge, visible only in dark mode */}
        <path d={shape.body} fill="none" stroke="var(--sticker-edge)" strokeWidth="5" strokeLinejoin="round" />
        <path d={shape.body} fill={shape.fill} stroke="#000" strokeWidth="1.25" strokeLinejoin="round" />
        {shape.detail && (
          <path
            d={shape.detail}
            fill={shape.detailFill ?? 'none'}
            stroke="#000"
            strokeWidth={shape.detailStroke ?? '1.25'}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </span>
  );
}
