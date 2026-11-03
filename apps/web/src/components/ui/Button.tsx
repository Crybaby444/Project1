import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from '@/i18n/navigation';

type Variant = 'primary' | 'ghost';
type Size = 'md' | 'lg';

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
};

type ButtonAsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> & {
    href?: undefined;
    loading?: boolean;
  };

type ButtonAsLink = CommonProps & {
  href: string;
  loading?: never;
};

export type ButtonProps = ButtonAsButton | ButtonAsLink;

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-cta-bg text-cta-fg border-cta-bg',
  ghost: 'bg-surface text-ink border-ink hover:bg-mist',
};

const SIZES: Record<Size, string> = {
  md: 'min-h-10 px-4 text-[14px]',
  lg: 'min-h-12 px-6 text-[15px]',
};

function classes(variant: Variant, size: Size, className = '') {
  return [
    'inline-flex max-w-full cursor-pointer items-center justify-center gap-2 rounded-full border text-center leading-tight font-bold tracking-[0.03em]',
    'transition-[transform,background-color] duration-150 ease-yoyo',
    'hover:-translate-y-0.5 active:translate-y-0 active:scale-[.97]',
    'disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0',
    VARIANTS[variant],
    SIZES[size],
    className,
  ].join(' ');
}

/** Pill button: black-filled primary CTA or outlined ghost. With `href` it renders a localized link. */
export function Button(props: ButtonProps) {
  const { variant = 'primary', size = 'md', className, children } = props;

  if (props.href !== undefined) {
    return (
      <Link href={props.href} data-variant={variant} className={classes(variant, size, className)}>
        {children}
      </Link>
    );
  }

  const { loading = false, disabled, type = 'button', variant: _v, size: _s, className: _c, ...rest } = props;
  return (
    <button
      type={type}
      data-variant={variant}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={classes(variant, size, className)}
      {...rest}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent"
        />
      )}
      {children}
    </button>
  );
}
