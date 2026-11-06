import type { StickerColor } from '@yoyo/shared';
import type { ReactNode } from 'react';

type ChipProps = {
  children: ReactNode;
  pressed: boolean;
  onPressedChange: (next: boolean) => void;
  /** Sticker colour fill (e.g. per category); without it the chip is paper white. */
  color?: StickerColor;
  /** Decorative icon shown before the label (give it aria-hidden). */
  icon?: ReactNode;
  /** Which way the chip tips on hover; alternate it in a row for a hand-placed look. */
  tilt?: 'left' | 'right';
  className?: string;
};

// Sticker fills are the same in both themes, so their text colour is fixed too.
const COLOR_FILL: Record<StickerColor, string> = {
  blue: 'bg-sticker-blue text-black',
  mint: 'bg-sticker-mint text-black',
  lavender: 'bg-sticker-lavender text-black',
  ember: 'bg-sticker-ember text-black',
  sun: 'bg-sticker-sun text-black',
  violet: 'bg-sticker-violet text-white',
};

/** Pill toggle (filters, categories). Pressed chips turn into the Carbon/CTA fill. */
export function Chip({
  children,
  pressed,
  onPressedChange,
  color,
  icon,
  tilt = 'left',
  className = '',
}: ChipProps) {
  const fill = pressed ? 'bg-cta text-cta-fg border-cta' : color ? `${COLOR_FILL[color]} border-ink` : 'bg-surface text-ink border-ink';
  const hoverTilt = tilt === 'left' ? 'hover:-rotate-4' : 'hover:rotate-4';

  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={() => onPressedChange(!pressed)}
      className={`inline-flex min-h-10 items-center gap-2 rounded-pill border px-4 text-sm font-bold transition-[transform,background-color,color] duration-250 ease-yoyo hover:-translate-y-0.5 ${hoverTilt} active:scale-[0.96] ${fill} ${className}`}
    >
      {icon}
      {children}
    </button>
  );
}
