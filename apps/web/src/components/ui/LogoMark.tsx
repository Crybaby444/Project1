type LogoMarkProps = {
  size?: number;
  className?: string;
};

/** Circular 1px-outlined badge with a yo-yo on its string (DESIGN.md "Project adaptations" §11). */
export function LogoMark({ size = 40, className = '' }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <circle cx="20" cy="20" r="19.5" fill="var(--surface)" stroke="var(--ink)" strokeWidth="1" />
      <path d="M20 0.5 V12" stroke="var(--ink)" strokeWidth="1" strokeLinecap="round" />
      <circle cx="20" cy="22" r="10" fill="var(--sticker-blue)" stroke="var(--ink)" strokeWidth="1" />
      <circle cx="20" cy="22" r="3.5" fill="var(--surface)" stroke="var(--ink)" strokeWidth="1" />
    </svg>
  );
}
