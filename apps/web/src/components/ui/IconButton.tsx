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
      className={`border-ink bg-surface text-ink ease-yoyo hover:bg-mist inline-grid size-10 shrink-0 cursor-pointer place-items-center rounded-full border transition-[transform,background-color] duration-150 hover:-translate-y-0.5 active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
