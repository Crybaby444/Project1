type MarkProps = {
  /** Width and height in pixels. */
  size?: number;
  /**
   * The yo-yo hangs on its string (the logo). Anything that spins (the loader) uses `string={false}`:
   * a centred disc with the slit, so it turns about its own middle instead of wobbling on the string.
   */
  string?: boolean;
  className?: string;
};

/** The Yoyo mark (v16): a solid yo-yo with the slit across its face, on a short string. */
export function Mark({ size = 24, string = true, className }: MarkProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {string ? (
        <>
          <path d="M12 1v4.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="12" cy="14" r="8.6" fill="currentColor" />
          <path d="M4.2 14h15.6" stroke="var(--canvas)" strokeWidth="2" />
        </>
      ) : (
        <>
          <circle cx="12" cy="12" r="10" fill="currentColor" />
          <path d="M2.6 12h18.8" stroke="var(--canvas)" strokeWidth="2.3" />
        </>
      )}
    </svg>
  );
}
