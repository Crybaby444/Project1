'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { prefersReducedMotion } from '@/lib/motion';

export type StickerKind = 'coin' | 'check' | 'bolt' | 'star' | 'yoyo';

interface StickerProps {
  kind: StickerKind;
  /** Accessible name. Without it the sticker is decorative and hidden from screen readers. */
  label?: string;
  size?: number;
  /** Resting tilt in degrees — stickers are never grid-aligned. */
  rotate?: number;
  className?: string;
}

const STAR =
  'M32 5 L39.6 22.6 L58.6 24.2 L44.2 36.7 L48.5 55.4 L32 45.5 L15.5 55.4 L19.8 36.7 L5.4 24.2 L24.4 22.6 Z';
const BOLT = 'M36 4 L12 36 H29 L24 60 L52 24 H35 Z';

/** Outline shape of each sticker, reused for the dark-mode die-cut edge. */
function silhouette(kind: StickerKind, props: Record<string, string | number>): ReactNode {
  switch (kind) {
    case 'coin':
    case 'yoyo':
      return <circle cx="32" cy="32" r="26" {...props} />;
    case 'check':
      return <rect x="7" y="7" width="50" height="50" rx="16" {...props} />;
    case 'bolt':
      return <path d={BOLT} strokeLinejoin="round" {...props} />;
    case 'star':
      return <path d={STAR} strokeLinejoin="round" {...props} />;
  }
}

const FILL: Record<StickerKind, string> = {
  coin: 'var(--sticker-sun)',
  check: 'var(--sticker-mint)',
  bolt: 'var(--sticker-ember)',
  star: 'var(--sticker-violet)',
  yoyo: 'var(--sticker-blue)',
};

function details(kind: StickerKind): ReactNode {
  switch (kind) {
    case 'coin':
      return (
        <>
          <circle cx="32" cy="32" r="18" fill="none" stroke="#000" />
          <path
            d="M32 21v22M27 26h10M27 38h10"
            stroke="#000"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      );
    case 'check':
      return (
        <path
          d="M20 33 L28.5 41.5 L45 24"
          fill="none"
          stroke="#000"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    case 'yoyo':
      return (
        <>
          <circle cx="32" cy="32" r="11" fill="var(--sticker-sun)" stroke="#000" />
          <circle cx="32" cy="32" r="3" fill="#000" />
          <path d="M32 6 C40 -2 52 4 50 14" fill="none" stroke="#000" strokeLinecap="round" />
        </>
      );
    default:
      return null;
  }
}

/**
 * Flat sticker with a 1px outline. Still at rest; wobbles on hover and spins
 * once on click. Gets a thin white die-cut edge in the dark theme.
 */
export function Sticker({ kind, label, size = 64, rotate = 0, className = '' }: StickerProps) {
  const [spinning, setSpinning] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  // Native listener: React's synthetic animation events depend on vendor detection.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const settle = () => setSpinning(false);
    el.addEventListener('animationend', settle);
    el.addEventListener('animationcancel', settle);
    return () => {
      el.removeEventListener('animationend', settle);
      el.removeEventListener('animationcancel', settle);
    };
  }, []);
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true as const };

  return (
    <span
      {...a11y}
      ref={ref}
      data-spinning={spinning || undefined}
      onClick={() => {
        if (!prefersReducedMotion()) setSpinning(true);
      }}
      style={{ width: size, height: size, rotate: `${rotate}deg` }}
      className={`group/sticker inline-block shrink-0 select-none hover:animate-sticker-wobble data-spinning:animate-sticker-spin ${className}`}
    >
      <svg viewBox="-4 -4 72 72" width={size} height={size} className="overflow-visible">
        {silhouette(kind, {
          fill: 'var(--sticker-edge)',
          stroke: 'var(--sticker-edge)',
          strokeWidth: 6,
        })}
        {silhouette(kind, { fill: FILL[kind], stroke: '#000', strokeWidth: 1 })}
        {details(kind)}
      </svg>
    </span>
  );
}
