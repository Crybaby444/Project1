import type { ButtonHTMLAttributes, ReactNode } from 'react';

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'children'> & {
  /** Required: an icon-only button must say what it does. */
  label: string;
  /**
   * `ink` (an ink outline) on the page: a calendar's arrows, the gallery, share. `quiet` (a 15% outline that
   * darkens on hover) for the controls of the frame: the header, the admin's corner (DESIGN.md "Controls").
   */
  tone?: 'ink' | 'quiet';
  children: ReactNode;
};

const TONE = { ink: 'border-ink', quiet: 'border-ink/15 hover:border-ink/50' } as const;

/** 40×40 circular button with a 1px outline, for icon-only actions. */
export function IconButton({ label, children, className = '', type = 'button', tone = 'ink', ...rest }: IconButtonProps) {
  return (
    <button
      title={label}
      {...rest}
      type={type}
      aria-label={label}
      className={`relative inline-grid size-10 place-items-center rounded-pill border ${TONE[tone]} bg-surface text-ink transition-[transform,border-color] duration-150 ease-yoyo hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-55 ${className}`}
    >
      {children}
    </button>
  );
}
