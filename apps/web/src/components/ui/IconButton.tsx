import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  /** Required accessible name — icon-only buttons have no visible text. */
  label: string;
  children: ReactNode;
}

/** 40×40 circular button with a 1px outline. */
export function IconButton({
  label,
  children,
  className = '',
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-pill border border-ink bg-surface text-ink transition-[translate,scale] duration-(--dur-fast) ease-yoyo hover:-translate-y-0.5 active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
