import type { ReactNode } from 'react';
import type { PlacedSticker } from '@/components/decor/StickerCluster';
import { StickerCluster } from '@/components/decor/StickerCluster';
import { displayFit } from '@/lib/display-fit';

export type Tone = 'canvas' | 'surface' | 'band';

const TONE: Record<Tone, string> = {
  canvas: 'bg-canvas',
  surface: 'bg-surface',
  band: 'bg-band',
};

type SectionProps = {
  id: string;
  tone: Tone;
  children: ReactNode;
  className?: string;
};

/**
 * A full-bleed colour band of the landing page (DESIGN.md Section Background Panel): no borders or
 * shadows, the colour change is the divider. Its content settles in as it scrolls into view (`reveal`,
 * transform only); the band itself stays put so the colours never show a gap.
 */
export function Section({ id, tone, children, className = '' }: SectionProps) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`relative overflow-x-clip scroll-mt-4 ${TONE[tone]}`}>
      <div className={`reveal relative mx-auto max-w-[1440px] px-4 py-20 sm:px-8 sm:py-28 ${className}`}>{children}</div>
    </section>
  );
}

type SectionTitleProps = {
  id: string;
  eyebrow: string;
  title: string;
  stickers?: PlacedSticker[];
  /** Largest size on a wide screen; the longest word always fits the column on a phone. */
  max?: string;
  align?: 'start' | 'center';
};

/** Eyebrow pill plus a crushed display title, with stickers pinned around it. */
export function SectionTitle({ id, eyebrow, title, stickers = [], max = '9rem', align = 'start' }: SectionTitleProps) {
  const center = align === 'center';
  return (
    <div className={`@container relative flex w-full flex-col gap-5 ${center ? 'items-center text-center' : 'items-start'}`}>
      <p className="border-ink bg-surface text-ink rounded-pill border px-3 py-1.5 text-xs font-bold tracking-[0.032em] uppercase">
        {eyebrow}
      </p>
      <h2
        id={`${id}-title`}
        style={displayFit(title, { min: '2.25rem', max })}
        className="font-display text-display-fit relative z-10 w-full leading-[0.82] font-black text-balance uppercase"
      >
        {title}
      </h2>
      {stickers.length > 0 && <StickerCluster items={stickers} />}
    </div>
  );
}
