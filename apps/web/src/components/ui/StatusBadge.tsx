import { STATUS_TONE_COLOR, type StatusTone } from '@yoyo/shared';
import type { ReactNode } from 'react';

interface StatusBadgeProps {
  tone: StatusTone;
  /** Decorative icon; the text label carries the meaning (colour is never the only signal). */
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}

export function StatusBadge({ tone, icon, children, className = '' }: StatusBadgeProps) {
  const color = tone === 'completed' ? '#ffffff' : '#000000';
  return (
    <span
      data-tone={tone}
      style={{ backgroundColor: STATUS_TONE_COLOR[tone], color }}
      className={`inline-flex min-h-7 items-center gap-1.5 rounded-pill border border-ink px-3 text-[13px] leading-none font-bold tracking-[0.03em] whitespace-nowrap ${className}`}
    >
      <span aria-hidden="true" className="inline-flex size-4 items-center justify-center">
        {icon}
      </span>
      {children}
    </span>
  );
}
