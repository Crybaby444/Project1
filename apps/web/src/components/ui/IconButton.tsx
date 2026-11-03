import type { ButtonHTMLAttributes, ReactNode } from 'react';

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'children'> & {
  /** Accessible name; required because the button shows only an icon. */
  label: string;
  children: ReactNode;
};

/** 40×40 circular button with a 1px outline. */
export function IconButton({ label, children, className = '', type = 'button', ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={`inline-grid size-10 shrink-0 cursor-pointer place-items-center rounded-full border border-ink bg-surface text-ink transition-[transform,background-color] duration-150 ease-yoyo hover:-translate-y-0.5 hover:bg-mist active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
