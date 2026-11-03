import { STATUS_TONE_COLOR, type StatusTone } from '@yoyo/shared';
import type { ReactNode } from 'react';

type StatusBadgeProps = {
  tone: StatusTone;
  /** Decorative icon; the text label carries the meaning, so colour is never the only signal. */
  icon: ReactNode;
  children: ReactNode;
  className?: string;
};

export function StatusBadge({ tone, icon, children, className = '' }: StatusBadgeProps) {
  return (
    <span
      data-tone={tone}
      style={{
        backgroundColor: STATUS_TONE_COLOR[tone],
        color: tone === 'completed' ? '#ffffff' : '#000000',
      }}
      className={`border-ink inline-flex min-h-7 items-center gap-1.5 rounded-full border px-3 text-[13px] leading-none font-bold tracking-[0.03em] ${className}`}
    >
      <span aria-hidden="true" className="inline-grid size-3.5 place-items-center [&>svg]:size-full">
        {icon}
      </span>
      <span>{children}</span>
    </span>
  );
}
