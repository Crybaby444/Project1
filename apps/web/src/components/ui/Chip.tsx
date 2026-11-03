import type { StickerColor } from '@yoyo/shared';
import type { ReactNode } from 'react';

type ChipProps = {
  pressed: boolean;
  onPressedChange: (next: boolean) => void;
  color?: StickerColor;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
};

const PRESSED_BG: Record<StickerColor, string> = {
  blue: 'bg-sticker-blue text-black',
  mint: 'bg-sticker-mint text-black',
  lavender: 'bg-sticker-lavender text-black',
  ember: 'bg-sticker-ember text-black',
  sun: 'bg-sticker-sun text-black',
  violet: 'bg-sticker-violet text-white',
};

/** Toggle pill for filters and tags. Tilts ±4° and lifts on hover. */
export function Chip({ pressed, onPressedChange, color = 'sun', icon, children, className = '' }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={() => onPressedChange(!pressed)}
      className={`border-ink ease-yoyo inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border px-4 text-[14px] font-bold tracking-[0.03em] transition-[transform,background-color] duration-150 hover:-translate-y-0.5 hover:-rotate-[4deg] even:hover:rotate-[4deg] active:scale-[.97] ${
        pressed ? PRESSED_BG[color] : 'bg-surface text-ink hover:bg-mist'
      } ${className}`}
    >
      {icon && (
        <span aria-hidden="true" className="inline-grid size-4 place-items-center">
          {icon}
        </span>
      )}
      {children}
    </button>
  );
}
