import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { TransitionLink } from '@/components/motion/TransitionLink';

type Variant = 'primary' | 'ghost';
type Size = 'md' | 'lg';

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  /** Renders a locale-aware link styled as a button; it moves to the page with the page transition. */
  href?: string;
  /** Shows a spinner, marks the button busy and blocks clicks. */
  loading?: boolean;
};

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-pill border font-bold tracking-[0.03em] uppercase select-none ' +
  'transition-[transform,background-color,color] duration-150 ease-yoyo ' +
  'hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.96] ' +
  'disabled:pointer-events-none disabled:opacity-55';

const VARIANTS: Record<Variant, string> = {
  // DESIGN.md: the single highest-priority action per screen is filled Carbon (white in dark mode).
  primary: 'border-cta bg-cta text-cta-fg',
  ghost: 'border-ink bg-surface text-ink hover:bg-mist',
};

const SIZES: Record<Size, string> = {
  md: 'min-h-10 px-4 text-[13px]',
  lg: 'min-h-12 px-6 text-[15px]',
};

function Spinner() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 animate-spin">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  href,
  loading = false,
  className = '',
  type = 'button',
  disabled,
  ...rest
}: ButtonProps) {
  const classes = `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`;

  if (href !== undefined) {
    return (
      <TransitionLink href={href} className={classes}>
        {children}
      </TransitionLink>
    );
  }

  return (
    <button
      {...rest}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={classes}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}
