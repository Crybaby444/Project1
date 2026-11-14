import type { StatusTone } from '@yoyo/shared';
import type { ReactNode } from 'react';

type StatusBadgeProps = {
  tone: StatusTone;
  /** Decorative icon (aria-hidden); the visible label carries the meaning. */
  icon: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * Black and white (v16, owner 2026-11-13: no colour). The tones differ by line and fill, with the icon
 * and the words; a dispute carries the one red.
 */
const TONE: Record<StatusTone, string> = {
  requested: 'border-ink border-dashed text-ink',
  active: 'border-ink bg-ink text-canvas',
  deposit: 'border-ink bg-mist text-ink',
  dispute: 'border-[var(--danger)] text-ink [&_svg]:text-[var(--danger)]',
  completed: 'border-ink text-ink',
  cancelled: 'border-ink/30 text-ink/75',
};

/** Pill status: line, icon and text together, so colour is never the only signal. */
export function StatusBadge({ tone, icon, children, className = '' }: StatusBadgeProps) {
  return (
    <span
      data-tone={tone}
      className={`rounded-pill inline-flex min-h-7 items-center gap-1.5 border px-3 text-[13px] font-bold whitespace-nowrap [&_svg]:size-3.5 [&_svg]:shrink-0 ${TONE[tone]} ${className}`}
    >
      {icon}
      {children}
    </span>
  );
}
