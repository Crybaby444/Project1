import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from 'react';
import { Link } from '@/i18n/navigation';

type Variant = 'primary' | 'ghost';
type Size = 'md' | 'lg';

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}

type ButtonAsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & {
    href?: undefined;
    loading?: boolean;
  };

type ButtonAsLink = CommonProps &
  Omit<ComponentProps<typeof Link>, keyof CommonProps | 'href'> & {
    href: string;
    loading?: never;
  };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-cta-bg text-cta-fg border-cta-bg',
  ghost: 'bg-surface text-ink border-ink',
};

const SIZES: Record<Size, string> = {
  md: 'min-h-10 px-4 text-[14px]',
  lg: 'min-h-12 px-6 text-[15px]',
};

export function buttonClasses(variant: Variant = 'primary', size: Size = 'md', extra = ''): string {
  return [
    'inline-flex cursor-pointer items-center justify-center gap-2 rounded-pill border text-center font-bold tracking-[0.032em]',
    'transition-[translate,scale] duration-(--dur-fast) ease-yoyo',
    'hover:-translate-y-0.5 active:translate-y-0 active:scale-[.97]',
    'disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0',
    VARIANTS[variant],
    SIZES[size],
    extra,
  ].join(' ');
}

function Spinner() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      width="16"
      height="16"
      className="motion-safe:animate-spin"
    >
      <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeOpacity=".3" />
      <path
        d="M8 1.5A6.5 6.5 0 0 1 14.5 8"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Pill button. Renders a localized link when `href` is given. */
export function Button(props: ButtonProps) {
  if (props.href !== undefined) {
    const { variant, size, className, children, href, ...rest } = props;
    return (
      <Link href={href} className={buttonClasses(variant, size, className)} {...rest}>
        {children}
      </Link>
    );
  }

  const { variant, size, className, children, loading = false, disabled, type, ...rest } = props;
  return (
    <button
      type={type ?? 'button'}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses(variant, size, className)}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}
