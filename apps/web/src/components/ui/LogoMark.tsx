type LogoMarkProps = {
  size?: number;
  className?: string;
};

/** Circular 1px-outlined badge with a yo-yo on its string. Decorative: pair it with the wordmark. */
export function LogoMark({ size = 40, className = '' }: LogoMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-grid shrink-0 place-items-center rounded-full border border-ink bg-surface ${className}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62} fill="none">
        <path d="M12 1.5V8" stroke="var(--sticker-blue)" strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="15" r="7.25" fill="var(--sticker-blue)" stroke="var(--ink)" strokeWidth="1" />
        <circle cx="12" cy="15" r="2.5" fill="var(--surface)" stroke="var(--ink)" strokeWidth="1" />
      </svg>
    </span>
  );
}
