import type { StickerColor } from '@yoyo/shared';
import type { ReactNode } from 'react';

type ChipProps = {
  children: ReactNode;
  pressed: boolean;
  onPressedChange: (next: boolean) => void;
  /** Kept for callers; v16 draws every chip the same quiet way. */
  color?: StickerColor;
  /** Decorative icon shown before the label (give it aria-hidden). */
  icon?: ReactNode;
  /** Which way the chip tips on hover; alternate it in a row for a hand-placed look. */
  tilt?: 'left' | 'right';
  className?: string;
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
  // v16: quiet pills. `color` and `tilt` are still accepted (callers pass them) but no longer drawn.
  void color; void tilt;
  const fill = pressed ? 'bg-cta text-cta-fg border-cta' : 'bg-transparent text-ink border-ink hover:bg-mist';

  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={() => onPressedChange(!pressed)}
      className={`inline-flex min-h-10 items-center gap-2 rounded-pill border px-4 text-sm font-bold transition-[transform,background-color,color] duration-250 ease-yoyo active:scale-[0.96] ${fill} ${className}`}
    >
      {icon}
      {children}
    </button>
  );
}
