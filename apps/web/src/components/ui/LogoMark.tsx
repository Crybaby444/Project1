interface LogoMarkProps {
  size?: number;
  className?: string;
  /** Accessible name; omit when the mark sits next to visible brand text. */
  label?: string;
}

/** Circular 1px-outlined badge with a yo-yo on its string. */
export function LogoMark({ size = 40, className = '', label }: LogoMarkProps) {
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className={`shrink-0 ${className}`}
      {...a11y}
    >
      <circle cx="20" cy="20" r="19.5" fill="var(--surface)" stroke="var(--ink)" />
      <path d="M20 0.5 V14" stroke="var(--ink)" strokeLinecap="round" />
      <circle cx="20" cy="23" r="10" fill="var(--sticker-blue)" stroke="#000" />
      <circle cx="20" cy="23" r="4.5" fill="var(--sticker-sun)" stroke="#000" />
      <circle cx="20" cy="23" r="1.2" fill="#000" />
    </svg>
  );
}
