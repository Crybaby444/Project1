'use client';

import { useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from 'react';
import { useReducedMotion, useScrollFallback } from './hooks';

/**
 * Page tones (tokens.css): the three paper bands (canvas, surface, band) or a sticker colour softened
 * for a full-page background.
 */
export type Tone = 'canvas' | 'surface' | 'band' | 'blue' | 'mint' | 'lavender' | 'sun' | 'ember' | 'violet';

type ToneSectionProps = {
  tone: Tone;
  children: ReactNode;
  as?: ElementType;
  className?: string;
  id?: string;
  'aria-labelledby'?: string;
};

/**
 * A page section that owns a background tone. As it scrolls up past the middle of the screen the
 * whole page background morphs into its colour (motion.css, `[data-tone-section]`): a fixed layer of
 * that colour fades in over the previous one, driven by the section's CSS view timeline, or by an
 * IntersectionObserver where scroll timelines are missing (Safari before 26, Firefox). Only opacity
 * animates. With reduced motion the section simply has its colour as a flat band.
 */
export function ToneSection({
  tone,
  children,
  as: Tag = 'section',
  className = '',
  ...rest
}: ToneSectionProps) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const fallback = useScrollFallback();
  const [active, setActive] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!fallback || reduced || !element || typeof IntersectionObserver === 'undefined') return;
    // The layer is on while the section's top is above the middle of the screen.
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (entry) setActive(entry.isIntersecting || entry.boundingClientRect.top < 0);
      },
      { rootMargin: '0px 0px -50% 0px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [fallback, reduced]);

  return (
    <Tag
      ref={ref}
      {...rest}
      data-tone-section=""
      style={{ '--tone-bg': `var(--tone-${tone})` } as CSSProperties}
      className={className}
    >
      <span aria-hidden="true" data-tone-layer="" data-active={active ? '' : undefined} />
      {children}
    </Tag>
  );
}
