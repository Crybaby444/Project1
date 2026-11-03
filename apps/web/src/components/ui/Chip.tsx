import type { StickerColor } from '@yoyo/shared';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ChipProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onClick' | 'color' | 'aria-pressed'
> {
  pressed: boolean;
  onPressedChange(next: boolean): void;
  /** Sticker colour used as the fill while pressed. */
  color?: StickerColor;
  icon?: ReactNode;
  children: ReactNode;
}

const PRESSED_FILL: Record<StickerColor, string> = {
  blue: 'aria-pressed:bg-sticker-blue',
  mint: 'aria-pressed:bg-sticker-mint',
  lavender: 'aria-pressed:bg-sticker-lavender',
  ember: 'aria-pressed:bg-sticker-ember',
  sun: 'aria-pressed:bg-sticker-sun',
  violet: 'aria-pressed:bg-sticker-violet aria-pressed:text-white',
};

/** Pill toggle (filters, categories). Wobbles like a sticker on hover. */
export function Chip({
  pressed,
  onPressedChange,
  color = 'lavender',
  icon,
  children,
  className = '',
  type = 'button',
  ...rest
}: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={pressed}
      onClick={() => onPressedChange(!pressed)}
      className={[
        'inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-pill border border-ink bg-surface px-4 text-[14px] font-bold tracking-[0.03em] text-ink',
        'transition-[translate,rotate,background-color] duration-(--dur-base) ease-yoyo',
        'hover:-translate-y-0.5 hover:-rotate-4 even:hover:rotate-4 active:scale-[.97]',
        // Pressed fills are sticker colours, so the text stays black in both themes.
        'aria-pressed:text-black',
        PRESSED_FILL[color],
        className,
      ].join(' ')}
      {...rest}
    >
      {icon && (
        <span aria-hidden="true" className="inline-flex">
          {icon}
        </span>
      )}
      {children}
    </button>
  );
}
