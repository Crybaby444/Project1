type WordmarkProps = {
  className?: string;
};

/** The "YOYO" wordmark in the display face; assistive tech reads it as "Yoyo". */
export function Wordmark({ className = '' }: WordmarkProps) {
  return (
    <span
      role="img"
      aria-label="Yoyo"
      className={`font-display leading-[0.8] font-black tracking-normal uppercase ${className}`}
    >
      YOYO
    </span>
  );
}
