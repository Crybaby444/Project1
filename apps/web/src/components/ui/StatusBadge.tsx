import { STATUS_TONE_COLOR, type StatusTone } from '@yoyo/shared';
import type { ReactNode } from 'react';

type StatusBadgeProps = {
  tone: StatusTone;
  /** Decorative icon (aria-hidden); the visible label carries the meaning. */
  icon: ReactNode;
  children: ReactNode;
  className?: string;
};

/** Pill status sticker: colour, icon and text together, so colour is never the only signal. */
export function StatusBadge({ tone, icon, children, className = '' }: StatusBadgeProps) {
  return (
    <span
      data-tone={tone}
      style={{ backgroundColor: STATUS_TONE_COLOR[tone], color: tone === 'completed' ? '#ffffff' : '#000000' }}
      className={`inline-flex min-h-7 items-center gap-1.5 rounded-pill border border-black px-3 text-[13px] font-bold whitespace-nowrap [&_svg]:size-3.5 [&_svg]:shrink-0 ${className}`}
    >
      {icon}
      {children}
    </span>
  );
}
