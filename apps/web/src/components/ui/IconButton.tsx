import type { ButtonHTMLAttributes, ReactNode } from 'react';

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'children'> & {
  /** Required: an icon-only button must say what it does. */
  label: string;
  children: ReactNode;
};

/** 40×40 circular button with a 1px outline, for icon-only actions. */
export function IconButton({ label, children, className = '', type = 'button', ...rest }: IconButtonProps) {
  return (
    <button
      title={label}
      {...rest}
      type={type}
      aria-label={label}
      className={`relative inline-grid size-10 place-items-center rounded-pill border border-ink bg-surface text-ink transition-transform duration-150 ease-yoyo hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.94] disabled:pointer-events-none disabled:opacity-55 ${className}`}
    >
      {children}
    </button>
  );
}
